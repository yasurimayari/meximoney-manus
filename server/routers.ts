import { COOKIE_NAME } from "@shared/const";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  accounts,
  budgets,
  calendarColorPreferences,
  calendarEvents,
  categories,
  collaborationInvites,
  creditCards,
  creditReports,
  creditScoreRecords,
  debts,
  debtBalanceAdjustments,
  debtPayments,
  decisionRecords,
  exchangeRates,
  financeDocuments,
  financeNotifications,
  financeTasks,
  financedAssetPurchases,
  financialContacts,
  fiscalPeriodReviews,
  fiscalRecords,
  financialGoals,
  financialPlanLevels,
  financialPlanLinks,
  financialPlanPeriods,
  financialPlanScenarios,
  financialPlans,
  financialProfiles,
  financialProjects,
  financialTransactions,
  investments,
  investmentOperations,
  monthlyReviewControls,
  monthlyReviews,
  monthlyFinancialStatements,
  notificationPreferences,
  personalScoreSnapshots,
  localCredentials,
  passwordResetEvents,
  passwordResetTokens,
  payablePayments,
  payables,
  privacyConsents,
  projectMilestones,
  qualityIssueAcknowledgements,
  receivables,
  receivablePayments,
  recurringTemplates,
  surplusAllocationPolicies,
  users,
  workspaceEntities,
  travelPlans,
  travelItems,
  travelCategories,
} from "../drizzle/schema";
import { calculateDebtReduction } from "../shared/debtReduction";
import { calculateMoratoriumInterest } from "../shared/moratorium";
import { financedAssetAmounts } from "../shared/financedAssetPricing";
import { createPasswordResetToken, hashPassword, hashPasswordResetToken, verifyPassword } from "./credentials";
import { sendPasswordResetEmail } from "./passwordResetEmail";
import { passwordResetRequestResponse } from "./passwordResetResponse";
import { normalizeLoanKind } from "../shared/manualObligations";
import { financialPlanTemplate, dateAtNoonUtc } from "../shared/financialPlanTemplate";
import { deleteAllFinancialData, deleteOwnedRow, getFinanceSnapshot, getProfile, requireDb, resolveWorkspaceAccess } from "./db";
import { storagePut } from "./storage";
import { requiresPersonalProfileConsent } from "./profilePrivacy";
import { calculateMonthlyStatement, monthBounds } from "./finance";
import { comparableInvestmentValueCents } from "./investmentData";
import { applyInvestmentDelta, investmentOperationDelta, totalsFromInvestmentOperations } from "./investmentOperations";
import { findPossibleDuplicates } from "./imports";
import { getOpenFiscalReviewReminder } from "../shared/fiscalReview";
import { creditCardAlertCandidates } from "./creditCardAlerts";
import { payableAlertCandidates, upcomingTravelAlertCandidates } from "./scheduledAlertCandidates";
import { extractQuickCaptureDraft } from "./quickCapture";
import { askClaudeForMexi } from "./claude";
import { mexicoCityReferenceMonth } from "./monthReference";
import { calculatePersonalScore } from "./personalScore";
import { buildManualAmortizationSchedule, debtPaymentBreakdownIsValid } from "./debtAmortization";
import { decodePdfUpload } from "./documentUpload";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const scopeSchema = z.enum(["personal", "business", "mixed"]);
const timeZoneSchema = z.string().trim().min(1).max(64).refine(value => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; } }, "Zona horaria IANA inválida");
const creditCardScopeSchema = z.enum(["personal", "pfae", "business", "mixed"]);
const moneySchema = z.number().int().min(0);
const optionalDate = z.number().int().positive().nullable().optional();
const dashboardPeriodInput = z.object({ referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).optional();
const calendarColorCategorySchema = z.enum(["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other", "debt_due", "document_due", "task_due", "fiscal_reserve"]);
const calendarColorKeySchema = z.enum(["teal", "emerald", "sky", "indigo", "violet", "amber", "orange", "rose", "slate"]);
const importRowSchema = z.object({ accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), type: z.enum(["income", "expense"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), reportCurrency: z.string().length(3).nullable().optional(), reportAmountCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), occurredAt: z.number().int().positive(), isEssential: z.boolean().default(false), status: z.enum(["confirmed", "estimated", "needs_review"]).default("confirmed"), bankReference: z.string().trim().max(160).nullable().optional(), notes: z.string().max(3000).nullable().optional(), allowPossibleDuplicate: z.boolean().default(false) });
const manualOnlyNotice = "Meximoney trabaja solo con tus registros manuales. No tiene acceso a bancos ni puede ejecutar acciones financieras.";
const credentialInput = z.object({
  email: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres.").max(128),
});
const authenticatedPasswordChangeInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12, "La nueva contraseña debe tener al menos 12 caracteres.").max(128),
});
const securityHistoryInput = z.object({
  periodDays: z.union([z.literal(30), z.literal(90), z.literal(180)]).default(90),
}).default({ periodDays: 90 });

function scoreFromSnapshot(snapshot: any, referenceDate: Date) {
  const reportCurrency = snapshot.dashboard.reportCurrency;
  const creditCards = snapshot.creditCards.filter((card: any) => card.status !== "closed" && card.currency === reportCurrency);
  const debts = snapshot.debts.filter((debt: any) => (debt.status === "active" || debt.status === "review") && debt.currency === reportCurrency);
  const creditScore = snapshot.creditScoreRecords.filter((record: any) => new Date(record.reportedAt) <= referenceDate).sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())[0] ?? null;
  const emergencyFundCents = snapshot.goals.filter((goal: any) => goal.type === "emergency" && goal.status === "active" && goal.currency === reportCurrency).reduce((sum: number, goal: any) => sum + goal.currentCents, 0);
  const recentTransactionCount = snapshot.transactions.filter((transaction: any) => transaction.occurredAt >= new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000) && transaction.occurredAt <= referenceDate).length;
  const principalPaidLast30DaysCents = snapshot.debtPayments.filter((payment: any) => payment.currency === reportCurrency && payment.paidAt >= new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000) && payment.paidAt <= referenceDate).reduce((sum: number, payment: any) => sum + payment.principalCents, 0);
  return calculatePersonalScore({
    netWorthCents: snapshot.dashboard.netWorth.netWorthCents,
    creditCardBalanceCents: creditCards.reduce((sum: number, card: any) => sum + card.balanceCents, 0),
    creditLimitCents: creditCards.reduce((sum: number, card: any) => sum + card.creditLimitCents, 0),
    creditScore: creditScore?.score ?? null,
    emergencyFundCents,
    incomeCents: snapshot.dashboard.cashFlow.incomeCents,
    expenseCents: snapshot.dashboard.cashFlow.expenseCents,
    recentTransactionCount,
    principalPaidLast30DaysCents,
    outstandingDebtCents: debts.reduce((sum: number, debt: any) => sum + debt.balanceCents, 0),
  });
}

async function setLocalSession(ctx: { req: any; res: any }, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name || "Usuario Meximoney" });
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
  return token;
}

const privateFinanceProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const db = await requireDb();
  const consent = await db
    .select()
    .from(privacyConsents)
    .where(and(eq(privacyConsents.userId, ctx.user.id), eq(privacyConsents.purpose, "almacenamiento_manual_financiero")))
    .limit(1);

  if (!consent[0]?.accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Debes aceptar el almacenamiento manual de datos antes de crear, modificar o analizar información financiera.",
    });
  }
  return next();
});

const workspaceFinanceProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const db = await requireDb();
  const workspaceAccess = await resolveWorkspaceAccess(ctx.user.id);
  const consent = await db
    .select()
    .from(privacyConsents)
    .where(and(eq(privacyConsents.userId, workspaceAccess.ownerId), eq(privacyConsents.purpose, "almacenamiento_manual_financiero")))
    .limit(1);
  if (!consent[0]?.accepted) {
    throw new TRPCError({ code: "FORBIDDEN", message: "La propietaria debe aceptar el almacenamiento manual antes de compartir o modificar información financiera." });
  }
  return next({ ctx: { workspaceAccess } });
});

function asDate(value: number | null | undefined) {
  return value ? new Date(value) : null;
}

const financialPlanResourceTable = {
  budget: budgets,
  debt: debts,
  credit_card: creditCards,
  payable: payables,
  receivable: receivables,
  goal: financialGoals,
  task: financeTasks,
  calendar_event: calendarEvents,
  fiscal_review: fiscalPeriodReviews,
  document: financeDocuments,
} as const;

async function assertFinancialPlanResourceOwnership(db: Awaited<ReturnType<typeof requireDb>>, userId: number, resourceType: keyof typeof financialPlanResourceTable, resourceId: number) {
  const table = financialPlanResourceTable[resourceType];
  const [resource] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, resourceId), eq(table.userId, userId))).limit(1);
  if (!resource) throw new TRPCError({ code: "BAD_REQUEST", message: "La referencia seleccionada no pertenece a tu espacio privado." });
}

export function receivableSettlement(receivable: { amountCents: number; dueAt: Date | null }, payments: Array<{ amountCents: number; linkedTransactionId: number | null; paidAt: Date }>) {
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingCents = Math.max(0, receivable.amountCents - paidCents);
  const completelyLinked = payments.length > 0 && payments.every(payment => payment.linkedTransactionId !== null);
  const status: "pending" | "overdue" | "paid" | "reconciled" = remainingCents === 0 ? (completelyLinked ? "reconciled" : "paid") : receivable.dueAt && receivable.dueAt.getTime() < Date.now() ? "overdue" : "pending";
  return { paidCents, remainingCents, status, paidAt: remainingCents === 0 ? payments.reduce<Date | null>((latest, payment) => !latest || payment.paidAt > latest ? payment.paidAt : latest, null) : null };
}

export function payableSettlement(payable: { amountCents: number; dueAt: Date | null }, payments: Array<{ amountCents: number; linkedTransactionId: number | null; paidAt: Date }>) {
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingCents = Math.max(0, payable.amountCents - paidCents);
  const completelyLinked = payments.length > 0 && payments.every(payment => payment.linkedTransactionId !== null);
  const status: "pending" | "overdue" | "paid" | "reconciled" = remainingCents === 0 ? (completelyLinked ? "reconciled" : "paid") : payable.dueAt && payable.dueAt.getTime() < Date.now() ? "overdue" : "pending";
  return { paidCents, remainingCents, status, paidAt: remainingCents === 0 ? payments.reduce<Date | null>((latest, payment) => !latest || payment.paidAt > latest ? payment.paidAt : latest, null) : null };
}

function createManualSnapshotText(snapshot: Awaited<ReturnType<typeof getFinanceSnapshot>>) {
  return JSON.stringify({
    profile: snapshot.profile,
    accounts: snapshot.accounts.map(item => ({ name: item.name, type: item.type, scope: item.scope, currency: item.currency, valueCents: item.currentValueCents, liquid: item.isLiquid, valuationDate: item.valuationDate })),
    categories: snapshot.categories.map(item => ({ id: item.id, name: item.name, type: item.type, scope: item.scope })),
    transactions: snapshot.transactions.slice(-150).map(item => ({ type: item.type, scope: item.scope, amountCents: item.amountCents, currency: item.currency, occurredAt: item.occurredAt, categoryId: item.categoryId, accountId: item.accountId, status: item.status, notes: item.notes })),
    debts: snapshot.debts.map(item => ({ name: item.name, balanceCents: item.balanceCents, currency: item.currency, interestRateBps: item.interestRateBps, minimumPaymentCents: item.minimumPaymentCents, nextDueAt: item.nextDueAt, priority: item.priority, status: item.status })),
    goals: snapshot.goals.map(item => ({ name: item.name, targetCents: item.targetCents, currentCents: item.currentCents, monthlyContributionCents: item.monthlyContributionCents, targetDate: item.targetDate, priority: item.priority, status: item.status })),
    tasks: snapshot.tasks.map(item => ({ title: item.title, priority: item.priority, status: item.status, dueAt: item.dueAt })),
    calendarEvents: snapshot.calendarEvents.map(item => ({ title: item.title, eventType: item.eventType, scope: item.scope, startsAt: item.startsAt, recurrence: item.recurrence, status: item.status })),
    statements: snapshot.statements.map(item => ({ periodStart: item.periodStart, scope: item.scope, status: item.status, incomeCents: item.incomeCents, expenseCents: item.expenseCents, netCashFlowCents: item.netCashFlowCents, assetCents: item.assetCents, liabilityCents: item.liabilityCents, netWorthCents: item.netWorthCents })),
    dashboard: snapshot.dashboard,
  });
}

type NotificationCandidate = { type: string; title: string; message: string; relatedEntityType: string; relatedEntityId: number };
type NotificationPreferenceState = { inAppEnabled: boolean; calendarEnabled: boolean; documentsEnabled: boolean; debtsEnabled: boolean; reviewsEnabled: boolean; budgetEnabled: boolean; taxReserveEnabled: boolean; travelsEnabled: boolean; reminderDays: number; creditUtilizationThresholdPercent: number; telegramEnabled: boolean; telegramScheduleCronTaskUid: string | null; telegramLastDigestDate: string | null };

const defaultNotificationPreferences: NotificationPreferenceState = { inAppEnabled: true, calendarEnabled: true, documentsEnabled: true, debtsEnabled: true, reviewsEnabled: true, budgetEnabled: true, taxReserveEnabled: true, travelsEnabled: true, reminderDays: 7, creditUtilizationThresholdPercent: 20, telegramEnabled: false, telegramScheduleCronTaskUid: null, telegramLastDigestDate: null };

export function buildNotificationCandidates(snapshot: any, preferences: NotificationPreferenceState, now = new Date()): NotificationCandidate[] {
  if (!preferences.inAppEnabled) return [];
  const horizon = new Date(now.getTime() + preferences.reminderDays * 24 * 60 * 60 * 1000);
  const candidates: NotificationCandidate[] = [];
  if (preferences.calendarEnabled) (snapshot.calendarEvents ?? []).filter((event: any) => event.status === "planned" && event.startsAt >= now && event.startsAt <= horizon).forEach((event: any) => candidates.push({ type: "calendar", title: `Próximo: ${event.title}`, message: `Tienes una fecha programada en los próximos ${preferences.reminderDays} días.`, relatedEntityType: "calendar_event", relatedEntityId: event.id }));
  if (preferences.documentsEnabled) (snapshot.documents ?? []).filter((document: any) => document.expiresAt && document.expiresAt >= now && document.expiresAt <= horizon).forEach((document: any) => candidates.push({ type: "document", title: `Documento próximo a vencer: ${document.name}`, message: "Revisa el documento y su referencia antes de su vencimiento.", relatedEntityType: "document", relatedEntityId: document.id }));
  if (preferences.debtsEnabled) (snapshot.debts ?? []).filter((debt: any) => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= horizon).forEach((debt: any) => candidates.push({ type: "debt", title: `Vencimiento próximo: ${debt.name}`, message: "Revisa esta deuda y confirma manualmente su siguiente pago o ajuste.", relatedEntityType: "debt", relatedEntityId: debt.id }));
  if (preferences.debtsEnabled) creditCardAlertCandidates(snapshot.creditCards ?? [], now, preferences.reminderDays).forEach(candidate => candidates.push(candidate));
  if (preferences.debtsEnabled) payableAlertCandidates(snapshot.payables ?? [], now, preferences.reminderDays).forEach(candidate => candidates.push(candidate));
  if (preferences.travelsEnabled) upcomingTravelAlertCandidates(snapshot.travelPlans ?? [], now, preferences.reminderDays).forEach(candidate => candidates.push(candidate));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (preferences.budgetEnabled) (snapshot.budgets ?? []).filter((budget: any) => budget.periodStart >= monthStart && budget.periodStart < nextMonthStart).forEach((budget: any) => candidates.push({ type: "budget", title: "Revisión manual de presupuesto", message: "Revisa manualmente este presupuesto mensual frente a tus registros confirmados.", relatedEntityType: "budget", relatedEntityId: budget.id }));
  if (preferences.taxReserveEnabled && snapshot.profile?.futureTaxReserveCents > 0 && snapshot.profile.futureTaxDueAt && snapshot.profile.futureTaxDueAt >= now && snapshot.profile.futureTaxDueAt <= horizon) candidates.push({ type: "tax_reserve", title: "Revisa tu reserva fiscal manual", message: "Hay una fecha de referencia cercana. Confirma tus datos antes de tomar cualquier decisión fiscal.", relatedEntityType: "financial_profile", relatedEntityId: snapshot.profile.id });
  if (preferences.reviewsEnabled && snapshot.workspaceAccess?.role !== "manager") (snapshot.transactions ?? []).filter((transaction: any) => transaction.reviewStatus === "pending_review").forEach((transaction: any) => candidates.push({ type: "review", title: "Movimiento pendiente de revisión", message: "Hay un movimiento que espera confirmación humana.", relatedEntityType: "transaction", relatedEntityId: transaction.id }));
  if (preferences.reviewsEnabled && snapshot.workspaceAccess?.role === "owner") {
    const pfaeReminder = getOpenFiscalReviewReminder(snapshot.fiscalRecords ?? [], snapshot.fiscalPeriodReviews ?? [], now);
    if (pfaeReminder) candidates.push({ type: "pfae_review", title: `Revisión PFAE pendiente: ${pfaeReminder.periodLabel}`, message: "El periodo anterior tiene renglones o una rutina abierta. Revísalo manualmente antes de cerrar tu expediente.", relatedEntityType: "fiscal_period_review", relatedEntityId: pfaeReminder.relatedEntityId });
  }
  return candidates;
}

function visibleNotificationTypes(preferences: NotificationPreferenceState) {
  return new Set([preferences.calendarEnabled && "calendar", preferences.documentsEnabled && "document", preferences.debtsEnabled && "debt", preferences.debtsEnabled && "payable", preferences.debtsEnabled && "credit_card_cutoff", preferences.debtsEnabled && "credit_card_payment", preferences.debtsEnabled && "credit_card_overlimit", preferences.travelsEnabled && "travel", preferences.reviewsEnabled && "review", preferences.reviewsEnabled && "pfae_review", preferences.budgetEnabled && "budget", preferences.taxReserveEnabled && "tax_reserve"]);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(credentialInput.extend({ name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select({ id: localCredentials.id }).from(localCredentials).where(eq(localCredentials.email, input.email)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });

      const openId = `local_${randomUUID().replace(/-/g, "")}`;
      await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        loginMethod: "email_password",
        lastSignedIn: new Date(),
      });
      const user = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (!user[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta." });
      await db.insert(localCredentials).values({ userId: user[0].id, email: input.email, passwordHash: await hashPassword(input.password) });
      const sessionToken = await setLocalSession(ctx, user[0]);
      return { success: true, sessionToken, user: { name: user[0].name, email: user[0].email } };
    }),
    login: publicProcedure.input(credentialInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.select({ user: users, credential: localCredentials }).from(localCredentials).innerJoin(users, eq(localCredentials.userId, users.id)).where(eq(localCredentials.email, input.email)).limit(1);
      const record = result[0];
      if (!record || !(await verifyPassword(input.password, record.credential.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos." });
      }
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, record.user.id));
      const sessionToken = await setLocalSession(ctx, record.user);
      return { success: true, sessionToken, user: { name: record.user.name, email: record.user.email } };
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().email().max(320).transform(value => value.toLowerCase()) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const record = await db.select({ userId: localCredentials.userId, email: localCredentials.email }).from(localCredentials).where(eq(localCredentials.email, input.email)).limit(1);
      const deliveryReady = process.env.PASSWORD_RESET_EMAIL_ENABLED === "true";
      const genericResponse = passwordResetRequestResponse(deliveryReady);
      if (!deliveryReady) return genericResponse;
      if (!record[0]) return genericResponse;
      await db.insert(passwordResetEvents).values({ userId: record[0].userId, eventType: "requested" });
      const rawToken = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record[0].userId));
      await db.insert(passwordResetTokens).values({ userId: record[0].userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
      const host = ctx.req.get("host");
      const baseUrl = host === "mexifinance-stkndi6z.manus.space" ? `https://${host}` : "https://mexifinance-stkndi6z.manus.space";
      try {
        await sendPasswordResetEmail({ to: record[0].email, resetUrl: `${baseUrl}/restablecer-contrasena?token=${encodeURIComponent(rawToken)}` });
        await db.insert(passwordResetEvents).values({ userId: record[0].userId, eventType: "email_sent" });
      } catch (error) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
        await db.insert(passwordResetEvents).values({ userId: record[0].userId, eventType: "email_failed" });
        console.error("[Password reset] Email delivery failed", error);
      }
      return genericResponse;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(30).max(200), password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres.").max(128) })).mutation(async ({ input }) => {
      const db = await requireDb();
      const tokenHash = hashPasswordResetToken(input.token);
      const token = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
      if (!token[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace de restablecimiento no es válido o ya venció." });
      await db.transaction(async tx => {
        await tx.update(localCredentials).set({ passwordHash: await hashPassword(input.password) }).where(eq(localCredentials.userId, token[0].userId));
        await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token[0].id));
        await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, token[0].userId), isNull(passwordResetTokens.usedAt)));
        await tx.insert(passwordResetEvents).values({ userId: token[0].userId, eventType: "password_reset" });
      });
      return { success: true };
    }),
    changePassword: protectedProcedure.input(authenticatedPasswordChangeInput).mutation(async ({ ctx, input }) => {
      if (input.currentPassword === input.newPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La nueva contraseña debe ser distinta de la actual." });
      }
      const db = await requireDb();
      const credential = await db.select({ id: localCredentials.id, passwordHash: localCredentials.passwordHash })
        .from(localCredentials)
        .where(eq(localCredentials.userId, ctx.user.id))
        .limit(1);
      if (!credential[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cuenta no tiene una contraseña local que se pueda cambiar desde Meximoney." });
      }
      if (!(await verifyPassword(input.currentPassword, credential[0].passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db.transaction(async tx => {
        await tx.update(localCredentials).set({ passwordHash }).where(eq(localCredentials.userId, ctx.user.id));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, ctx.user.id));
        await tx.insert(passwordResetEvents).values({ userId: ctx.user.id, eventType: "password_changed", sourceLabel: "authenticated_session" });
      });
      return { success: true };
    }),
    securityStatus: protectedProcedure.input(securityHistoryInput).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const events = await db.select({ eventType: passwordResetEvents.eventType, channel: passwordResetEvents.channel, createdAt: passwordResetEvents.createdAt })
        .from(passwordResetEvents)
        .where(and(eq(passwordResetEvents.userId, ctx.user.id), gte(passwordResetEvents.createdAt, new Date(Date.now() - input.periodDays * 24 * 60 * 60 * 1000))))
        .orderBy(desc(passwordResetEvents.createdAt))
        .limit(50);
      const emailRecoveryEnabled = process.env.PASSWORD_RESET_EMAIL_ENABLED === "true";
      return {
        emailRecoveryEnabled,
        channelLabel: emailRecoveryEnabled ? "Canal habilitado" : "Canal no disponible",
        senderLabel: emailRecoveryEnabled ? "Remitente configurado" : "Remitente pendiente",
        periodDays: input.periodDays,
        events,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  finance: router({
    dashboard: protectedProcedure.input(dashboardPeriodInput).query(({ ctx, input }) => {
      const request = ctx.req as typeof ctx.req & { get?: (name: string) => string | undefined };
      const referenceHeader = request.get?.("x-meximoney-reference-date") ?? request.headers?.["x-meximoney-reference-date"];
      const referenceDate = input?.referenceDate ?? (Array.isArray(referenceHeader) ? referenceHeader[0] : referenceHeader);
      return referenceDate ? getFinanceSnapshot(ctx.user.id, mexicoCityReferenceMonth(referenceDate)) : getFinanceSnapshot(ctx.user.id);
    }),
    workspace: router({
      get: protectedProcedure.query(({ ctx }) => {
        const request = ctx.req as typeof ctx.req & { get?: (name: string) => string | undefined };
        const referenceHeader = request.get?.("x-meximoney-reference-date") ?? request.headers?.["x-meximoney-reference-date"];
        const referenceDate = Array.isArray(referenceHeader) ? referenceHeader[0] : referenceHeader;
        return referenceDate ? getFinanceSnapshot(ctx.user.id, mexicoCityReferenceMonth(referenceDate)) : getFinanceSnapshot(ctx.user.id);
      }),
      quickCapture: workspaceFinanceProcedure.input(z.object({ text: z.string().trim().min(4).max(800), defaultCurrency: z.string().trim().length(3) })).mutation(async ({ input }) => {
        return extractQuickCaptureDraft(input.text, input.defaultCurrency);
      }),
      onboarding: workspaceFinanceProcedure.input(z.object({
        workspaceName: z.string().trim().min(2).max(140),
        currency: z.string().length(3),
        residenceCountry: z.string().trim().min(2).max(80),
        taxResidence: z.string().trim().min(2).max(120),
        taxRegime: z.enum(["pfae_general", "resico", "other", "not_applicable"]),
        exchangeRatePolicy: z.enum(["manual", "manual_confirmed", "unconverted"]),
        humanReviewRequired: z.boolean(),
        entities: z.array(z.object({ name: z.string().trim().min(2).max(180), shortCode: z.string().trim().max(32).nullable().optional(), countryCode: z.string().length(2), legalForm: z.enum(["individual", "pfae", "sa_de_cv", "sapi", "sl", "llc", "holding", "other"]), status: z.enum(["active", "paused", "inactive", "planned", "dissolved"]), functionalCurrency: z.string().length(3), taxRegime: z.enum(["pfae_general", "resico", "corporate", "not_applicable", "other"]), notes: z.string().max(3000).nullable().optional() })).min(1).max(12),
      })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede completar el onboarding del espacio." });
        const db = await requireDb();
        const { entities, ...profile } = input;
        await db.transaction(async tx => {
          await tx.insert(financialProfiles).values({ userId: ctx.workspaceAccess.ownerId, ...profile, onboardingCompleted: true, onboardingStep: 4 }).onDuplicateKeyUpdate({ set: { ...profile, onboardingCompleted: true, onboardingStep: 4 } });
          const currentEntities = await tx.select({ id: workspaceEntities.id }).from(workspaceEntities).where(eq(workspaceEntities.ownerId, ctx.workspaceAccess.ownerId));
          if (currentEntities.length === 0) await tx.insert(workspaceEntities).values(entities.map(entity => ({ ownerId: ctx.workspaceAccess.ownerId, ...entity })));
        });
        return { success: true };
      }),
      entitySave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(180), shortCode: z.string().trim().max(32).nullable().optional(), countryCode: z.string().length(2), legalForm: z.enum(["individual", "pfae", "sa_de_cv", "sapi", "sl", "llc", "holding", "other"]), status: z.enum(["active", "paused", "inactive", "planned", "dissolved"]), functionalCurrency: z.string().length(3), taxRegime: z.enum(["pfae_general", "resico", "corporate", "not_applicable", "other"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar entidades." });
        const db = await requireDb(); const { id, ...values } = input;
        if (id) await db.update(workspaceEntities).set(values).where(and(eq(workspaceEntities.id, id), eq(workspaceEntities.ownerId, ctx.workspaceAccess.ownerId)));
        else await db.insert(workspaceEntities).values({ ownerId: ctx.workspaceAccess.ownerId, ...values });
        return { success: true };
      }),
      projectSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), previousGoalId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(2).max(160), status: z.enum(["active", "paused", "closed", "planned", "archived"]), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0f766e"), startsAt: optionalDate, targetAt: optionalDate, notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar proyectos." });
        const db = await requireDb(); const { id, goalId, previousGoalId, startsAt, targetAt, status, ...values } = input;
        if (values.entityId) { const [entity] = await db.select({ id: workspaceEntities.id }).from(workspaceEntities).where(and(eq(workspaceEntities.id, values.entityId), eq(workspaceEntities.ownerId, ctx.workspaceAccess.ownerId))).limit(1); if (!entity) throw new TRPCError({ code: "BAD_REQUEST", message: "La entidad seleccionada no pertenece a tu espacio." }); }
        if (goalId) { const [goal] = await db.select({ id: financialGoals.id, entityId: financialGoals.entityId }).from(financialGoals).where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, ctx.workspaceAccess.ownerId))).limit(1); if (!goal || (goal.entityId ?? null) !== (values.entityId ?? null)) throw new TRPCError({ code: "BAD_REQUEST", message: "El objetivo debe pertenecer a tu espacio y usar la misma entidad que el proyecto." }); }
        if (previousGoalId && id) { const [goal] = await db.select({ id: financialGoals.id }).from(financialGoals).where(and(eq(financialGoals.id, previousGoalId), eq(financialGoals.userId, ctx.workspaceAccess.ownerId), eq(financialGoals.projectId, id))).limit(1); if (!goal) throw new TRPCError({ code: "BAD_REQUEST", message: "El objetivo previo ya no está asociado a este proyecto." }); }
        const payload = { ...values, status, startsAt: asDate(startsAt), targetAt: asDate(targetAt), archivedAt: status === "archived" ? new Date() : null };
        await db.transaction(async tx => {
          let projectId = id;
          if (projectId) await tx.update(financialProjects).set(payload).where(and(eq(financialProjects.id, projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId)));
          else { const result = await tx.insert(financialProjects).values({ ownerId: ctx.workspaceAccess.ownerId, ...payload }); projectId = Number(result[0].insertId); }
          if (!projectId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No fue posible asociar el proyecto al objetivo." });
          if (previousGoalId && previousGoalId !== goalId) await tx.update(financialGoals).set({ projectId: null }).where(and(eq(financialGoals.userId, ctx.workspaceAccess.ownerId), eq(financialGoals.id, previousGoalId), eq(financialGoals.projectId, projectId)));
          if (goalId) await tx.update(financialGoals).set({ projectId }).where(and(eq(financialGoals.userId, ctx.workspaceAccess.ownerId), eq(financialGoals.id, goalId)));
        });
        return { success: true };
      }),
      projectRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar proyectos." });
        const db = await requireDb();
        const [dependencies, financialPlanDependency] = await Promise.all([
          db.select({ id: financeTasks.id }).from(financeTasks).where(and(eq(financeTasks.userId, ctx.workspaceAccess.ownerId), eq(financeTasks.projectId, input.id))).limit(1),
          db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.userId, ctx.workspaceAccess.ownerId), eq(financialPlans.projectId, input.id))).limit(1),
        ]);
        if (dependencies[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Este proyecto contiene tareas. Archívalo o elimina/desvincula primero sus elementos para conservar la trazabilidad." });
        if (financialPlanDependency[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Este proyecto contiene un Plan Financiero. Elimínalo o archívalo desde su propia sección antes de eliminar el proyecto." });
        await db.transaction(async tx => {
          await tx.update(financialGoals).set({ projectId: null }).where(and(eq(financialGoals.userId, ctx.workspaceAccess.ownerId), eq(financialGoals.projectId, input.id)));
          await tx.delete(financialProjects).where(and(eq(financialProjects.id, input.id), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId)));
        });
        return { success: true };
      }),
      contactSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(2).max(180), type: z.enum(["client", "supplier", "partner", "friend", "family", "employee", "other"]), email: z.string().trim().email().max(320).nullable().optional(), phone: z.string().trim().max(64).nullable().optional(), defaultCurrency: z.string().trim().length(3).nullable().optional(), status: z.enum(["active", "paused", "archived"]), notes: z.string().trim().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar contactos financieros." });
        const db = await requireDb(); const { id, ...values } = input;
        if (values.entityId) {
          const entity = await db.select({ id: workspaceEntities.id }).from(workspaceEntities).where(and(eq(workspaceEntities.id, values.entityId), eq(workspaceEntities.ownerId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!entity[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "La entidad seleccionada no pertenece a tu espacio." });
        }
        if (values.projectId) {
          const project = await db.select({ id: financialProjects.id }).from(financialProjects).where(and(eq(financialProjects.id, values.projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!project[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio." });
        }
        if (id) await db.update(financialContacts).set(values).where(and(eq(financialContacts.id, id), eq(financialContacts.userId, ctx.workspaceAccess.ownerId)));
        else await db.insert(financialContacts).values({ userId: ctx.workspaceAccess.ownerId, ...values });
        return { success: true };
      }),
      contactLoans: router({
        create: workspaceFinanceProcedure.input(z.object({
          contactId: z.number().int().positive(),
          name: z.string().trim().min(1).max(140),
          balanceCents: z.number().int().positive(),
          currency: z.string().length(3),
          installmentCents: moneySchema,
          nextDueAt: optionalDate,
          priority: z.enum(["critical", "high", "medium", "low"]),
          scope: scopeSchema,
          notes: z.string().max(3000).nullable().optional(),
        })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar préstamos de contactos." });
          const db = await requireDb();
          const [contact] = await db.select().from(financialContacts).where(and(eq(financialContacts.id, input.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "El contacto no pertenece a tu espacio privado." });
          const type = contact.type === "family" ? "family" as const : "loan" as const;
          await db.insert(debts).values({
            userId: ctx.workspaceAccess.ownerId,
            entityId: contact.entityId,
            projectId: contact.projectId,
            contactId: contact.id,
            name: input.name,
            creditor: contact.name,
            type,
            scope: input.scope,
            balanceCents: input.balanceCents,
            originalAmountCents: input.balanceCents,
            installmentCents: input.installmentCents || null,
            installmentCount: null,
            financedItem: null,
            purchasedAt: null,
            currency: input.currency,
            interestRateBps: null,
            minimumPaymentCents: input.installmentCents,
            nextDueAt: asDate(input.nextDueAt),
            endDate: null,
            priority: input.priority,
            status: "active",
            notes: input.notes ?? null,
          });
          return { success: true };
        }),
        paymentFromAccount: workspaceFinanceProcedure.input(z.object({
          debtId: z.number().int().positive(),
          sourceAccountId: z.number().int().positive(),
          amountCents: z.number().int().positive(),
          occurredAt: z.number().int().positive(),
          nextDueAt: optionalDate,
          status: z.enum(["confirmed", "estimated", "needs_review"]),
          notes: z.string().max(3000).nullable().optional(),
        })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar pagos de préstamos." });
          const db = await requireDb();
          const [[debt], [source]] = await Promise.all([
            db.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1),
            db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          ]);
          if (!debt || !debt.contactId) throw new TRPCError({ code: "NOT_FOUND", message: "El préstamo seleccionado no está vinculado a un contacto de tu espacio." });
          if (!source || source.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta de origen debe estar activa y pertenecer a tu espacio privado." });
          if (debt.status !== "active" && debt.status !== "review") throw new TRPCError({ code: "BAD_REQUEST", message: "El préstamo debe estar activo para registrar un pago." });
          if (debt.currency !== source.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago requiere que la cuenta y el préstamo usen la misma moneda." });
          if (input.amountCents > debt.balanceCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago no puede superar el saldo pendiente del préstamo." });
          const [contact] = await db.select().from(financialContacts).where(and(eq(financialContacts.id, debt.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "El contacto vinculado al préstamo no pertenece a tu espacio." });
          const groupId = randomUUID();
          const occurredAt = new Date(input.occurredAt);
          const suffix = input.notes?.trim() ? ` · ${input.notes.trim()}` : "";
          await db.transaction(async tx => {
            await tx.insert(financialTransactions).values([
              { userId: ctx.workspaceAccess.ownerId, entityId: source.entityId, projectId: source.projectId, accountId: source.id, debtId: null, creditCardId: null, contactId: contact.id, type: "transfer_out", scope: source.scope, amountCents: input.amountCents, currency: source.currency, reportCurrency: source.currency, reportAmountCents: input.amountCents, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: `Pago a ${contact.name}${suffix}` },
              { userId: ctx.workspaceAccess.ownerId, entityId: debt.entityId, projectId: debt.projectId, accountId: null, debtId: debt.id, creditCardId: null, contactId: contact.id, type: "transfer_in", scope: debt.scope, amountCents: input.amountCents, currency: debt.currency, reportCurrency: debt.currency, reportAmountCents: input.amountCents, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: `Pago desde ${source.name}${suffix}` },
            ]);
            const [counterpart] = await tx.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, groupId), eq(financialTransactions.type, "transfer_in"))).limit(1);
            if (!counterpart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo vincular el pago del préstamo." });
            await tx.insert(debtPayments).values({ userId: ctx.workspaceAccess.ownerId, debtId: debt.id, linkedTransactionId: counterpart.id, totalPaymentCents: input.amountCents, principalCents: input.amountCents, currency: debt.currency, paidAt: occurredAt, notes: input.notes ?? null });
            const nextBalance = debt.balanceCents - input.amountCents;
            await tx.update(debts).set({ balanceCents: nextBalance, status: nextBalance === 0 ? "paid" : "active", nextDueAt: nextBalance === 0 ? null : asDate(input.nextDueAt) }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true, groupId };
        }),
      }),
      exchangeRateSave: workspaceFinanceProcedure.input(z.object({ fromCurrency: z.string().length(3), toCurrency: z.string().length(3), rateMicros: z.number().int().min(1).max(2000000000), rateDate: z.number().int().positive(), source: z.enum(["manual", "confirmed_reference"]), notes: z.string().max(1000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede guardar tipos de cambio." });
        const db = await requireDb(); const { rateDate, ...values } = input;
        await db.insert(exchangeRates).values({ ownerId: ctx.workspaceAccess.ownerId, ...values, rateDate: new Date(rateDate) });
        return { success: true };
      }),
      invite: workspaceFinanceProcedure.input(z.object({ email: z.string().trim().email().max(320).transform(value => value.toLowerCase()), role: z.enum(["manager", "reviewer"]), canCreateDrafts: z.boolean(), canReview: z.boolean() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede invitar a una persona gestora." });
        const db = await requireDb();
        const existing = await db.select().from(collaborationInvites).where(and(eq(collaborationInvites.ownerId, ctx.workspaceAccess.ownerId), eq(collaborationInvites.invitedEmail, input.email))).limit(1);
        if (existing[0]) {
          await db.update(collaborationInvites).set({ role: input.role, canCreateDrafts: input.canCreateDrafts, canReview: input.canReview, invitedByUserId: ctx.user.id }).where(and(eq(collaborationInvites.id, existing[0].id), eq(collaborationInvites.ownerId, ctx.workspaceAccess.ownerId)));
          return { success: true, message: existing[0].status === "accepted" ? "Permisos de la persona colaboradora actualizados." : "Invitación existente actualizada." };
        }
        await db.insert(collaborationInvites).values({ ownerId: ctx.workspaceAccess.ownerId, invitedEmail: input.email, role: input.role, canCreateDrafts: input.canCreateDrafts, canReview: input.canReview, invitedByUserId: ctx.user.id });
        return { success: true, message: "Invitación creada. La persona debe registrarse con ese correo y aceptarla desde Meximoney." };
      }),
      acceptInvite: protectedProcedure.input(z.object({ inviteId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const invite = await db.select().from(collaborationInvites).where(and(eq(collaborationInvites.id, input.inviteId), eq(collaborationInvites.status, "invited"))).limit(1);
        if (!invite[0] || invite[0].invitedEmail !== ctx.user.email?.toLowerCase()) throw new TRPCError({ code: "FORBIDDEN", message: "Esta invitación no corresponde a tu cuenta." });
        await db.update(collaborationInvites).set({ status: "accepted", acceptedByUserId: ctx.user.id, acceptedAt: new Date() }).where(eq(collaborationInvites.id, input.inviteId));
        return { success: true };
      }),
      revokeInvite: workspaceFinanceProcedure.input(z.object({ inviteId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede revocar accesos." });
        const db = await requireDb();
        await db.update(collaborationInvites).set({ status: "revoked" }).where(and(eq(collaborationInvites.id, input.inviteId), eq(collaborationInvites.ownerId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
      transactionSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(), creditCardId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), type: z.enum(["income", "expense", "transfer_out", "transfer_in"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), reduceDebtBalance: z.boolean().optional().default(false), reportCurrency: z.string().length(3).nullable().optional(), reportAmountCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), occurredAt: z.number().int().positive(), isEssential: z.boolean(), transferGroupId: z.string().max(64).nullable().optional(), status: z.enum(["confirmed", "estimated", "needs_review"]), bankReference: z.string().trim().max(160).nullable().optional(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canCreateDrafts) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite crear borradores." });
        if (input.type === "transfer_out" || input.type === "transfer_in") throw new TRPCError({ code: "BAD_REQUEST", message: "Usa el formulario de traspaso entre cuentas para crear ambas partes de forma coherente." });
        const db = await requireDb(); const { id, occurredAt, exchangeRateDate, reduceDebtBalance, ...values } = input;
        if (values.contactId) {
          const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
        }
        if (values.creditCardId && values.type !== "expense") throw new TRPCError({ code: "BAD_REQUEST", message: "Una tarjeta de crédito sólo puede vincularse a un gasto." });
        const isOwner = ctx.workspaceAccess.role === "owner";
        if (values.debtId) {
          const [debt] = await db.select().from(debts).where(and(eq(debts.id, values.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!debt || debt.currency !== values.currency || (debt.status !== "active" && debt.status !== "review")) throw new TRPCError({ code: "BAD_REQUEST", message: "La deuda debe estar activa, pertenecer a tu espacio y usar la misma moneda." });
          if (values.type !== "expense") throw new TRPCError({ code: "BAD_REQUEST", message: "Una deuda sólo puede vincularse a un gasto real." });
          
        }
        if (reduceDebtBalance && (!values.debtId || values.type !== "expense" || !isOwner)) throw new TRPCError({ code: "BAD_REQUEST", message: "La reducción automática requiere un gasto con financiación y una sesión de propietaria." });
        const payload = { ...values, occurredAt: new Date(occurredAt), exchangeRateDate: asDate(exchangeRateDate), reviewStatus: isOwner ? "approved" as const : "pending_review" as const, status: isOwner ? values.status : "needs_review" as const, createdByUserId: ctx.user.id, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null };
        await db.transaction(async tx => {
          const previous = id ? (await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1))[0] : null;
          const previousDebtPayment = previous ? (await tx.select().from(debtPayments).where(and(eq(debtPayments.userId, ctx.workspaceAccess.ownerId), eq(debtPayments.linkedTransactionId, previous.id))).limit(1))[0] : null;
          if (previousDebtPayment) {
            const [previousDebt] = await tx.select().from(debts).where(and(eq(debts.id, previousDebtPayment.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (previousDebt) {
              const restoredBalance = previousDebt.balanceCents + previousDebtPayment.principalCents;
              await tx.update(debts).set({ balanceCents: restoredBalance, status: "active" }).where(and(eq(debts.id, previousDebt.id), eq(debts.userId, ctx.workspaceAccess.ownerId)));
            }
            await tx.delete(debtPayments).where(and(eq(debtPayments.id, previousDebtPayment.id), eq(debtPayments.userId, ctx.workspaceAccess.ownerId)));
          }
          if (reduceDebtBalance && payload.debtId) {
            const [debt] = await tx.select().from(debts).where(and(eq(debts.id, payload.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!debt || (debt.status !== "active" && debt.status !== "review")) throw new TRPCError({ code: "BAD_REQUEST", message: "La financiación debe estar activa o en revisión para reducir su saldo." });
            if (payload.amountCents > debt.balanceCents) throw new TRPCError({ code: "BAD_REQUEST", message: "La reducción no puede superar el saldo pendiente de la financiación." });
          }
          const cardIds = Array.from(new Set([previous?.creditCardId, payload.creditCardId].filter((cardId): cardId is number => Boolean(cardId))));
          const cards = cardIds.length ? await tx.select().from(creditCards).where(and(eq(creditCards.userId, ctx.workspaceAccess.ownerId), inArray(creditCards.id, cardIds))) : [];
          if (payload.creditCardId) {
            const card = cards.find(item => item.id === payload.creditCardId);
            if (!card || card.currency !== payload.currency || card.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "La tarjeta debe estar activa, pertenecer a tu espacio y usar la misma moneda." });
          }
          let transactionId = id;
          if (id) await tx.update(financialTransactions).set(payload).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId)));
          else { const result = await tx.insert(financialTransactions).values({ userId: ctx.workspaceAccess.ownerId, ...payload }); transactionId = Number((result as any)?.[0]?.insertId ?? 0) || undefined; }
          if (reduceDebtBalance && payload.debtId && transactionId) {
            const [debt] = await tx.select().from(debts).where(and(eq(debts.id, payload.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró la financiación seleccionada." });
            await tx.insert(debtPayments).values({ userId: ctx.workspaceAccess.ownerId, debtId: debt.id, linkedTransactionId: transactionId, totalPaymentCents: payload.amountCents, principalCents: payload.amountCents, interestCents: 0, lateInterestCents: 0, feeCents: 0, currency: payload.currency, paidAt: payload.occurredAt, notes: "Pago de principal registrado junto con el gasto" });
            const reduction = calculateDebtReduction(debt.balanceCents, payload.amountCents);
            if (!reduction) throw new TRPCError({ code: "BAD_REQUEST", message: "La reducción no puede superar el saldo pendiente de la financiación." });
            await tx.update(debts).set({ balanceCents: reduction.nextBalanceCents, status: reduction.status }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.workspaceAccess.ownerId)));
          }
          for (const card of cards) {
            const priorEffect = previous?.creditCardId === card.id && previous.type === "expense" ? previous.amountCents : 0;
            const nextEffect = payload.creditCardId === card.id && payload.type === "expense" ? payload.amountCents : 0;
            const nextBalance = card.balanceCents - priorEffect + nextEffect;
            await tx.update(creditCards).set({ balanceCents: nextBalance }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          }
        });
        return { success: true };
      }),
      creditCards: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(140), issuer: z.string().trim().max(140).nullable().optional(), cardKind: z.enum(["bank_credit", "departmental"]).default("bank_credit"), scope: creditCardScopeSchema, currency: z.string().length(3), creditLimitCents: moneySchema, balanceCents: z.number().int(), interestRateBps: z.number().int().min(0).nullable().optional(), minimumPaymentCents: moneySchema, statementClosingDay: z.number().int().min(1).max(31).nullable().optional(), paymentDueDay: z.number().int().min(1).max(31).nullable().optional(), status: z.enum(["active", "paused", "closed"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar tarjetas de crédito." });
          const db = await requireDb(); const { id, ...values } = input;
          if (id) await db.update(creditCards).set(values).where(and(eq(creditCards.id, id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(creditCards).values({ userId: ctx.workspaceAccess.ownerId, ...values });
          return { success: true };
        }),
        paymentSave: workspaceFinanceProcedure.input(z.object({ creditCardId: z.number().int().positive(), sourceAccountId: z.number().int().positive(), amountCents: z.number().int().positive(), occurredAt: z.number().int().positive(), status: z.enum(["confirmed", "estimated", "needs_review"]), bankReference: z.string().trim().max(160).nullable().optional(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar pagos de tarjeta." });
          const db = await requireDb();
          const [[card], [source]] = await Promise.all([
            db.select().from(creditCards).where(and(eq(creditCards.id, input.creditCardId), eq(creditCards.userId, ctx.workspaceAccess.ownerId))).limit(1),
            db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          ]);
          if (!card || !source || card.status !== "active" || source.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "La tarjeta y la cuenta de origen deben estar activas y pertenecer a tu espacio." });
          if (card.currency !== source.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago de tarjeta requiere la misma moneda en cuenta y tarjeta." });
          const groupId = randomUUID(); const occurredAt = new Date(input.occurredAt); const suffix = input.notes?.trim() ? ` · ${input.notes.trim()}` : ""; const bankReference = input.bankReference?.trim() || null;
          await db.transaction(async tx => {
            await tx.insert(financialTransactions).values([
              { userId: ctx.workspaceAccess.ownerId, entityId: source.entityId, projectId: source.projectId, accountId: source.id, type: "transfer_out", scope: source.scope, amountCents: input.amountCents, currency: source.currency, reportCurrency: source.currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), bankReference, notes: `Pago a ${card.name}${suffix}` },
              { userId: ctx.workspaceAccess.ownerId, entityId: card.entityId, projectId: card.projectId, creditCardId: card.id, type: "transfer_in", scope: card.scope === "pfae" ? "business" : card.scope, amountCents: input.amountCents, currency: card.currency, reportCurrency: card.currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), bankReference, notes: `Pago desde ${source.name}${suffix}` },
            ]);
            await tx.update(creditCards).set({ balanceCents: card.balanceCents - input.amountCents }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true, groupId };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar tarjetas." });
          const db = await requireDb();
          const movements = await db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.creditCardId, input.id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (movements[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminar una tarjeta con gastos o pagos vinculados. Ciérrala o elimina antes sus registros manuales." });
          await db.delete(creditCards).where(and(eq(creditCards.id, input.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          return { success: true };
        }),
      }),
      transferSave: workspaceFinanceProcedure.input(z.object({
        sourceAccountId: z.number().int().positive(), destinationAccountId: z.number().int().positive(), investmentId: z.number().int().positive().nullable().optional(), amountCents: z.number().int().positive(), occurredAt: z.number().int().positive(), status: z.enum(["confirmed", "estimated", "needs_review"]), notes: z.string().max(3000).nullable().optional(),
      })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canCreateDrafts) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite crear borradores." });
        if (input.sourceAccountId === input.destinationAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige dos cuentas distintas para el traspaso." });
        const db = await requireDb();
        const [source, destination] = await Promise.all([
          db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          db.select().from(accounts).where(and(eq(accounts.id, input.destinationAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
        ]);
        if (!source[0] || !destination[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Las cuentas del traspaso deben pertenecer a tu espacio privado." });
        if (source[0].status !== "active" || destination[0].status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Solo puedes traspasar entre cuentas activas." });
        if (source[0].currency !== destination[0].currency) throw new TRPCError({ code: "BAD_REQUEST", message: "Este formulario admite cuentas en la misma moneda. Registra una conversión manual confirmada por separado si aplica." });
        if (input.investmentId) {
          const [investment] = await db.select().from(investments).where(and(eq(investments.id, input.investmentId), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!investment || investment.currency !== destination[0].currency) throw new TRPCError({ code: "BAD_REQUEST", message: "La posición vinculada debe pertenecer a tu espacio y usar la moneda del traspaso." });
        }
        const isOwner = ctx.workspaceAccess.role === "owner";
        const groupId = randomUUID();
        const date = new Date(input.occurredAt);
        const status = isOwner ? input.status : "needs_review" as const;
        const reviewStatus = isOwner ? "approved" as const : "pending_review" as const;
        const suffix = input.notes?.trim() ? ` · ${input.notes.trim()}` : "";
        await db.transaction(async tx => {
          await tx.insert(financialTransactions).values([
            { userId: ctx.workspaceAccess.ownerId, entityId: source[0].entityId, projectId: source[0].projectId, accountId: source[0].id, type: "transfer_out", scope: source[0].scope, amountCents: input.amountCents, currency: source[0].currency, reportCurrency: source[0].currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt: date, isEssential: false, transferGroupId: groupId, status, reviewStatus, createdByUserId: ctx.user.id, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null, notes: `Traspaso a ${destination[0].name}${suffix}` },
            { userId: ctx.workspaceAccess.ownerId, entityId: destination[0].entityId, projectId: destination[0].projectId, accountId: destination[0].id, type: "transfer_in", scope: destination[0].scope, amountCents: input.amountCents, currency: destination[0].currency, reportCurrency: destination[0].currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt: date, isEssential: false, transferGroupId: groupId, status, reviewStatus, createdByUserId: ctx.user.id, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null, notes: `Traspaso desde ${source[0].name}${suffix}` },
          ]);
          if (input.investmentId) {
            const [incoming] = await tx.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, groupId), eq(financialTransactions.type, "transfer_in"))).limit(1);
            if (incoming) await tx.insert(investmentOperations).values({ userId: ctx.workspaceAccess.ownerId, investmentId: input.investmentId, linkedTransactionId: incoming.id, type: "contribution", amountCents: input.amountCents, currency: destination[0].currency, occurredAt: date, notes: `Aportación desde traspaso ${source[0].name} → ${destination[0].name}${suffix}` });
          }
        });
        return { success: true, groupId };
      }),
      transferUpdate: workspaceFinanceProcedure.input(z.object({
        transferGroupId: z.string().uuid(), sourceAccountId: z.number().int().positive(), destinationAccountId: z.number().int().positive(), amountCents: z.number().int().positive(), occurredAt: z.number().int().positive(), status: z.enum(["confirmed", "estimated", "needs_review"]), notes: z.string().max(3000).nullable().optional(),
      })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canCreateDrafts) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite editar traspasos." });
        if (input.sourceAccountId === input.destinationAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige dos cuentas distintas para el traspaso." });
        const db = await requireDb();
        const [source, destination, originalTransfers] = await Promise.all([
          db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          db.select().from(accounts).where(and(eq(accounts.id, input.destinationAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          db.select().from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, input.transferGroupId))),
        ]);
        if (!source[0] || !destination[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Las cuentas del traspaso deben pertenecer a tu espacio privado." });
        if (source[0].currency !== destination[0].currency) throw new TRPCError({ code: "BAD_REQUEST", message: "Este formulario admite cuentas en la misma moneda. Registra una conversión manual confirmada por separado si aplica." });
        const outgoing = originalTransfers.find(item => item.type === "transfer_out");
        const incoming = originalTransfers.find(item => item.type === "transfer_in");
        if (!outgoing || !incoming || originalTransfers.length !== 2) throw new TRPCError({ code: "BAD_REQUEST", message: "El traspaso no tiene una pareja editable completa. Revísalo antes de modificarlo." });
        if (incoming.creditCardId) throw new TRPCError({ code: "BAD_REQUEST", message: "Edita los pagos de tarjeta desde Tarjetas para conservar su saldo correctamente." });
        if (incoming.debtId) throw new TRPCError({ code: "BAD_REQUEST", message: "Edita los pagos de préstamos desde Contactos para conservar su saldo e historial correctamente." });
        const [linkedInvestmentOperation] = await db.select().from(investmentOperations).where(and(eq(investmentOperations.userId, ctx.workspaceAccess.ownerId), eq(investmentOperations.linkedTransactionId, incoming.id))).limit(1);
        if (linkedInvestmentOperation) throw new TRPCError({ code: "BAD_REQUEST", message: "Este traspaso está vinculado a una aportación de inversión. Revísalo desde Ahorro e inversiones para conservar la valuación trazable." });
        const isOwner = ctx.workspaceAccess.role === "owner";
        const status = isOwner ? input.status : "needs_review" as const;
        const reviewStatus = isOwner ? "approved" as const : "pending_review" as const;
        const occurredAt = new Date(input.occurredAt);
        const suffix = input.notes?.trim() ? ` · ${input.notes.trim()}` : "";
        await db.transaction(async tx => {
          await tx.update(financialTransactions).set({ entityId: source[0].entityId, projectId: source[0].projectId, accountId: source[0].id, type: "transfer_out", scope: source[0].scope, amountCents: input.amountCents, currency: source[0].currency, reportCurrency: source[0].currency, reportAmountCents: input.amountCents, occurredAt, status, reviewStatus, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null, notes: `Traspaso a ${destination[0].name}${suffix}` }).where(and(eq(financialTransactions.id, outgoing.id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId)));
          await tx.update(financialTransactions).set({ entityId: destination[0].entityId, projectId: destination[0].projectId, accountId: destination[0].id, type: "transfer_in", scope: destination[0].scope, amountCents: input.amountCents, currency: destination[0].currency, reportCurrency: destination[0].currency, reportAmountCents: input.amountCents, occurredAt, status, reviewStatus, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null, notes: `Traspaso desde ${source[0].name}${suffix}` }).where(and(eq(financialTransactions.id, incoming.id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId)));
        });
        return { success: true, transferGroupId: input.transferGroupId };
      }),
      transferRemove: workspaceFinanceProcedure.input(z.object({ transferGroupId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar un traspaso completo." });
        const db = await requireDb();
        await db.transaction(async tx => {
          const transfers = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, input.transferGroupId)));
          const cardPayment = transfers.find(item => item.creditCardId && item.type === "transfer_in");
          const loanPayment = transfers.find(item => item.debtId && item.type === "transfer_in");
          if (cardPayment?.creditCardId) {
            const [card] = await tx.select().from(creditCards).where(and(eq(creditCards.id, cardPayment.creditCardId), eq(creditCards.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (card) await tx.update(creditCards).set({ balanceCents: card.balanceCents + cardPayment.amountCents }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          }
          if (loanPayment?.debtId) throw new TRPCError({ code: "BAD_REQUEST", message: "No elimines un pago de préstamo desde Registros. Revísalo desde Contactos para conservar el saldo e historial correctamente." });
          const transferIds = transfers.map(transfer => transfer.id);
          if (transferIds.length) await tx.update(financeTasks).set({ linkedTransactionId: null }).where(and(eq(financeTasks.userId, ctx.workspaceAccess.ownerId), inArray(financeTasks.linkedTransactionId, transferIds)));
          await tx.delete(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, input.transferGroupId)));
        });
        return { success: true };
      }),
      receivables: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), counterparty: z.string().trim().min(1).max(180), origin: z.string().trim().min(1).max(220), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), issuedAt: z.number().int().positive(), dueAt: optionalDate, paidAt: optionalDate, status: z.enum(["pending", "overdue", "paid", "reconciled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar cuentas por cobrar." });
          const db = await requireDb(); const { id, issuedAt, dueAt, paidAt, ...values } = input;
          if (values.contactId) {
            const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
          }
          const payload = { ...values, issuedAt: new Date(issuedAt), dueAt: asDate(dueAt), paidAt: asDate(paidAt) };
          if (id) await db.update(receivables).set(payload).where(and(eq(receivables.id, id), eq(receivables.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(receivables).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          return { success: true };
        }),
        paymentSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), receivableId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), amountCents: z.number().int().positive(), currency: z.string().length(3), paidAt: z.number().int().positive(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar o conciliar abonos." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [receivable] = await tx.select().from(receivables).where(and(eq(receivables.id, input.receivableId), eq(receivables.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!receivable) throw new TRPCError({ code: "NOT_FOUND", message: "La cuenta por cobrar no pertenece a tu espacio." });
            if (receivable.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El abono debe usar la misma moneda que la cuenta por cobrar." });
            const existingPayments = await tx.select().from(receivablePayments).where(and(eq(receivablePayments.receivableId, receivable.id), eq(receivablePayments.userId, ctx.workspaceAccess.ownerId)));
            const otherPayments = existingPayments.filter(payment => payment.id !== input.id);
            const alreadyPaid = otherPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
            if (alreadyPaid + input.amountCents > receivable.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El abono supera el saldo pendiente de esta cuenta por cobrar." });
            if (input.linkedTransactionId) {
              const [income] = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, input.linkedTransactionId), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1);
              if (!income || income.type !== "income" || income.currency !== input.currency || income.reviewStatus !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un ingreso aprobado, de la misma moneda y de tu espacio privado." });
              const linkedElsewhere = await tx.select().from(receivablePayments).where(and(eq(receivablePayments.userId, ctx.workspaceAccess.ownerId), eq(receivablePayments.linkedTransactionId, income.id)));
              const linkedAmount = linkedElsewhere.filter(payment => payment.id !== input.id).reduce((sum, payment) => sum + payment.amountCents, 0);
              if (linkedAmount + input.amountCents > income.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe vinculado supera el ingreso real seleccionado." });
            }
            const payload = { receivableId: receivable.id, linkedTransactionId: input.linkedTransactionId ?? null, amountCents: input.amountCents, currency: input.currency, paidAt: new Date(input.paidAt), notes: input.notes ?? null };
            if (input.id) await tx.update(receivablePayments).set(payload).where(and(eq(receivablePayments.id, input.id), eq(receivablePayments.userId, ctx.workspaceAccess.ownerId)));
            else await tx.insert(receivablePayments).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
            const updatedPayments = input.id ? [...otherPayments, { ...payload, id: input.id, userId: ctx.workspaceAccess.ownerId, createdAt: new Date(), updatedAt: new Date() }] : [...existingPayments, { ...payload, id: -1, userId: ctx.workspaceAccess.ownerId, createdAt: new Date(), updatedAt: new Date() }];
            const settlement = receivableSettlement(receivable, updatedPayments);
            await tx.update(receivables).set({ status: settlement.status, paidAt: settlement.paidAt }).where(and(eq(receivables.id, receivable.id), eq(receivables.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        paymentRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar abonos." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [payment] = await tx.select().from(receivablePayments).where(and(eq(receivablePayments.id, input.id), eq(receivablePayments.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!payment) return;
            const [receivable] = await tx.select().from(receivables).where(and(eq(receivables.id, payment.receivableId), eq(receivables.userId, ctx.workspaceAccess.ownerId))).limit(1);
            await tx.delete(receivablePayments).where(and(eq(receivablePayments.id, payment.id), eq(receivablePayments.userId, ctx.workspaceAccess.ownerId)));
            if (!receivable) return;
            const remainingPayments = await tx.select().from(receivablePayments).where(and(eq(receivablePayments.receivableId, receivable.id), eq(receivablePayments.userId, ctx.workspaceAccess.ownerId)));
            const settlement = receivableSettlement(receivable, remainingPayments);
            await tx.update(receivables).set({ status: settlement.status, paidAt: settlement.paidAt }).where(and(eq(receivables.id, receivable.id), eq(receivables.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar cuentas por cobrar." });
          const db = await requireDb(); await db.delete(receivables).where(and(eq(receivables.id, input.id), eq(receivables.userId, ctx.workspaceAccess.ownerId))); return { success: true };
        }),
      }),
      payables: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), creditor: z.string().trim().min(1).max(180), origin: z.string().trim().min(1).max(220), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), issuedAt: z.number().int().positive(), dueAt: optionalDate, paidAt: optionalDate, status: z.enum(["pending", "overdue", "paid", "reconciled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar cuentas por pagar." });
          const db = await requireDb(); const { id, issuedAt, dueAt, paidAt, ...values } = input;
          if (values.contactId) {
            const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
          }
          const payload = { ...values, issuedAt: new Date(issuedAt), dueAt: asDate(dueAt), paidAt: asDate(paidAt) };
          if (id) await db.update(payables).set(payload).where(and(eq(payables.id, id), eq(payables.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(payables).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          return { success: true };
        }),
        paymentSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), payableId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), amountCents: z.number().int().positive(), currency: z.string().length(3), paidAt: z.number().int().positive(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar o conciliar pagos." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [payable] = await tx.select().from(payables).where(and(eq(payables.id, input.payableId), eq(payables.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!payable) throw new TRPCError({ code: "NOT_FOUND", message: "La cuenta por pagar no pertenece a tu espacio." });
            if (payable.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago debe usar la misma moneda que la cuenta por pagar." });
            const existingPayments = await tx.select().from(payablePayments).where(and(eq(payablePayments.payableId, payable.id), eq(payablePayments.userId, ctx.workspaceAccess.ownerId)));
            const otherPayments = existingPayments.filter(payment => payment.id !== input.id);
            if (otherPayments.reduce((sum, payment) => sum + payment.amountCents, 0) + input.amountCents > payable.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago supera el saldo pendiente de esta cuenta por pagar." });
            if (input.linkedTransactionId) {
              const [expense] = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, input.linkedTransactionId), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1);
              if (!expense || expense.type !== "expense" || expense.currency !== input.currency || expense.reviewStatus !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un gasto aprobado, de la misma moneda y de tu espacio privado." });
              const linkedElsewhere = await tx.select().from(payablePayments).where(and(eq(payablePayments.userId, ctx.workspaceAccess.ownerId), eq(payablePayments.linkedTransactionId, expense.id)));
              if (linkedElsewhere.filter(payment => payment.id !== input.id).reduce((sum, payment) => sum + payment.amountCents, 0) + input.amountCents > expense.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe vinculado supera el gasto real seleccionado." });
            }
            const payload = { payableId: payable.id, linkedTransactionId: input.linkedTransactionId ?? null, amountCents: input.amountCents, currency: input.currency, paidAt: new Date(input.paidAt), notes: input.notes ?? null };
            if (input.id) await tx.update(payablePayments).set(payload).where(and(eq(payablePayments.id, input.id), eq(payablePayments.userId, ctx.workspaceAccess.ownerId)));
            else await tx.insert(payablePayments).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
            const updatedPayments = input.id ? [...otherPayments, { ...payload, id: input.id, userId: ctx.workspaceAccess.ownerId, createdAt: new Date(), updatedAt: new Date() }] : [...existingPayments, { ...payload, id: -1, userId: ctx.workspaceAccess.ownerId, createdAt: new Date(), updatedAt: new Date() }];
            const settlement = payableSettlement(payable, updatedPayments);
            await tx.update(payables).set({ status: settlement.status, paidAt: settlement.paidAt }).where(and(eq(payables.id, payable.id), eq(payables.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        paymentRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar pagos." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [payment] = await tx.select().from(payablePayments).where(and(eq(payablePayments.id, input.id), eq(payablePayments.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!payment) return;
            const [payable] = await tx.select().from(payables).where(and(eq(payables.id, payment.payableId), eq(payables.userId, ctx.workspaceAccess.ownerId))).limit(1);
            await tx.delete(payablePayments).where(and(eq(payablePayments.id, payment.id), eq(payablePayments.userId, ctx.workspaceAccess.ownerId)));
            if (!payable) return;
            const remainingPayments = await tx.select().from(payablePayments).where(and(eq(payablePayments.payableId, payable.id), eq(payablePayments.userId, ctx.workspaceAccess.ownerId)));
            const settlement = payableSettlement(payable, remainingPayments);
            await tx.update(payables).set({ status: settlement.status, paidAt: settlement.paidAt }).where(and(eq(payables.id, payable.id), eq(payables.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar cuentas por pagar." });
          const db = await requireDb(); await db.delete(payables).where(and(eq(payables.id, input.id), eq(payables.userId, ctx.workspaceAccess.ownerId))); return { success: true };
        }),
      }),
      fiscalRecords: router({
        save: workspaceFinanceProcedure.input(z.object({
          id: z.number().int().positive().optional(),
          entityId: z.number().int().positive().nullable().optional(),
          projectId: z.number().int().positive().nullable().optional(),
          transactionId: z.number().int().positive().nullable().optional(),
          receivableId: z.number().int().positive().nullable().optional(),
          contactId: z.number().int().positive().nullable().optional(),
          documentId: z.number().int().positive().nullable().optional(),
          periodStart: z.number().int().positive(),
          description: z.string().trim().min(1).max(220),
          recordType: z.enum(["income_invoice", "expense_receipt", "payment_complement", "other"]),
          fiscalReference: z.string().trim().max(160).nullable().optional(),
          scope: scopeSchema,
          currency: z.string().trim().length(3),
          totalCents: moneySchema,
          taxableBaseCents: moneySchema,
          vatCents: moneySchema,
          invoiceIssuedAt: optionalDate,
          collectedAt: optionalDate,
          deductibility: z.enum(["pending", "deductible", "non_deductible", "review"]),
          reviewStatus: z.enum(["draft", "pending_review", "reviewed", "excluded"]),
          notes: z.string().max(3000).nullable().optional(),
          decisionNote: z.string().max(3000).nullable().optional(),
        })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar el libro fiscal manual." });
          const db = await requireDb();
          const { id, entityId, projectId, periodStart, invoiceIssuedAt, collectedAt, transactionId, receivableId, contactId, documentId, fiscalReference, notes, decisionNote, ...values } = input;
          const [entityRows, projectRows, transactionRows, receivableRows, contactRows, documentRows] = await Promise.all([
            entityId ? db.select().from(workspaceEntities).where(and(eq(workspaceEntities.id, entityId), eq(workspaceEntities.ownerId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
            projectId ? db.select().from(financialProjects).where(and(eq(financialProjects.id, projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
            transactionId ? db.select().from(financialTransactions).where(and(eq(financialTransactions.id, transactionId), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
            receivableId ? db.select().from(receivables).where(and(eq(receivables.id, receivableId), eq(receivables.userId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
            contactId ? db.select().from(financialContacts).where(and(eq(financialContacts.id, contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
            documentId ? db.select().from(financeDocuments).where(and(eq(financeDocuments.id, documentId), eq(financeDocuments.userId, ctx.workspaceAccess.ownerId))).limit(1) : Promise.resolve([]),
          ]);
          if (entityId && !entityRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "La entidad seleccionada no pertenece a tu espacio privado." });
          if (projectId && !projectRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio privado." });
          if (entityId && projectRows[0] && projectRows[0].entityId !== entityId) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado debe pertenecer a la entidad elegida." });
          if (transactionId && !transactionRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El movimiento seleccionado no pertenece a tu espacio privado." });
          if (receivableId && !receivableRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta por cobrar seleccionada no pertenece a tu espacio privado." });
          if (contactId && !contactRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
          if (documentId && !documentRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El documento seleccionado no pertenece a tu espacio privado." });
          if (transactionRows[0] && transactionRows[0].currency !== values.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El movimiento vinculado debe usar la misma moneda que el renglón fiscal." });
          if (receivableRows[0] && receivableRows[0].currency !== values.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta por cobrar vinculada debe usar la misma moneda que el renglón fiscal." });
          const reviewed = values.reviewStatus === "reviewed";
          const payload = {
            ...values,
            entityId: entityId ?? projectRows[0]?.entityId ?? null,
            projectId: projectId ?? null,
            transactionId: transactionId ?? null,
            receivableId: receivableId ?? null,
            contactId: contactId ?? null,
            documentId: documentId ?? null,
            fiscalReference: fiscalReference || null,
            notes: notes || null,
            decisionNote: decisionNote || null,
            periodStart: new Date(periodStart),
            invoiceIssuedAt: asDate(invoiceIssuedAt),
            collectedAt: asDate(collectedAt),
            reviewedByUserId: reviewed ? ctx.user.id : null,
            reviewedAt: reviewed ? new Date() : null,
          };
          if (id) await db.update(fiscalRecords).set(payload).where(and(eq(fiscalRecords.id, id), eq(fiscalRecords.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(fiscalRecords).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar renglones fiscales." });
          const db = await requireDb();
          await db.delete(fiscalRecords).where(and(eq(fiscalRecords.id, input.id), eq(fiscalRecords.userId, ctx.workspaceAccess.ownerId)));
          return { success: true };
        }),
      }),
      fiscalPeriodReviews: router({
        save: workspaceFinanceProcedure.input(z.object({
          periodStart: z.number().int().positive(),
          recordsConfirmed: z.boolean(),
          evidenceConfirmed: z.boolean(),
          collectionsConfirmed: z.boolean(),
          notes: z.string().max(3000).nullable().optional(),
          markReviewed: z.boolean(),
        })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede confirmar la rutina PFAE." });
          if (input.markReviewed && (!input.recordsConfirmed || !input.evidenceConfirmed || !input.collectionsConfirmed)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Confirma los tres pasos manuales antes de marcar el periodo como revisado." });
          }
          const db = await requireDb();
          const periodStart = new Date(input.periodStart);
          const [existing] = await db.select().from(fiscalPeriodReviews).where(and(eq(fiscalPeriodReviews.userId, ctx.workspaceAccess.ownerId), eq(fiscalPeriodReviews.periodStart, periodStart))).limit(1);
          const status = input.markReviewed ? "reviewed" as const : "open" as const;
          const payload = {
            status,
            recordsConfirmed: input.recordsConfirmed,
            evidenceConfirmed: input.evidenceConfirmed,
            collectionsConfirmed: input.collectionsConfirmed,
            notes: input.notes || null,
            reviewedByUserId: status === "reviewed" ? ctx.user.id : null,
            reviewedAt: status === "reviewed" ? new Date() : null,
          };
          if (existing) await db.update(fiscalPeriodReviews).set(payload).where(and(eq(fiscalPeriodReviews.id, existing.id), eq(fiscalPeriodReviews.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(fiscalPeriodReviews).values({ userId: ctx.workspaceAccess.ownerId, periodStart, ...payload });
          return { success: true, status };
        }),
      }),
      investments: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(180), type: z.enum(["savings", "fixed_income", "fund_etf", "stock", "crypto", "land", "property", "vehicle", "business_equity", "retirement", "other"]), institution: z.string().trim().max(180).nullable().optional(), scope: scopeSchema, currency: z.string().length(3), costBasisCents: moneySchema, currentValueCents: moneySchema, reportCurrency: z.string().length(3).nullable().optional(), reportValueCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, valuationDate: optionalDate, includeInNetWorth: z.boolean(), status: z.enum(["active", "paused", "closed"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar ahorro e inversiones." });
          const db = await requireDb(); const { id, exchangeRateDate, valuationDate, goalId, ...values } = input;
          if (goalId) {
            const [goal] = await db.select().from(financialGoals).where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!goal || goal.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un objetivo activo de tu espacio privado." });
            if (goal.currency !== values.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "La posición y el objetivo vinculado deben usar la misma moneda." });
          }
          const payload = { ...values, goalId: goalId ?? null, exchangeRateDate: asDate(exchangeRateDate), valuationDate: asDate(valuationDate) };
          const purchase = id ? (await db.select().from(financedAssetPurchases).where(and(eq(financedAssetPurchases.investmentId, id), eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId))).limit(1))[0] : null;
          if (!id || !purchase) {
            if (id) await db.update(investments).set(payload).where(and(eq(investments.id, id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
            else await db.insert(investments).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          } else {
            await db.transaction(async tx => {
              await tx.update(investments).set(payload).where(and(eq(investments.id, id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
              const nextAmounts = financedAssetAmounts(values.costBasisCents, purchase.cashContributionCents);
              await tx.update(financedAssetPurchases).set({ purchaseValueCents: nextAmounts.purchaseValueCents, financedAmountCents: nextAmounts.financedAmountCents }).where(and(eq(financedAssetPurchases.id, purchase.id), eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId)));
              if (purchase.debtId) await tx.update(debts).set({ originalAmountCents: nextAmounts.financedAmountCents }).where(and(eq(debts.id, purchase.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId)));
            });
          }
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar posiciones." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [asset] = await tx.select({ id: investments.id }).from(investments).where(and(eq(investments.id, input.id), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "La posición no pertenece a tu espacio privado." });
            const [purchase] = await tx.select().from(financedAssetPurchases).where(and(eq(financedAssetPurchases.investmentId, input.id), eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (purchase?.debtId) {
              const [payment] = await tx.select({ id: debtPayments.id }).from(debtPayments).where(and(eq(debtPayments.debtId, purchase.debtId), eq(debtPayments.userId, ctx.workspaceAccess.ownerId))).limit(1);
              const [adjustment] = await tx.select({ id: debtBalanceAdjustments.id }).from(debtBalanceAdjustments).where(and(eq(debtBalanceAdjustments.debtId, purchase.debtId), eq(debtBalanceAdjustments.userId, ctx.workspaceAccess.ownerId))).limit(1);
              if (payment || adjustment) throw new TRPCError({ code: "CONFLICT", message: "Este activo tiene cuotas o cargos de amortización. Archívalo para conservar su historial." });
              if (purchase) await tx.delete(financedAssetPurchases).where(and(eq(financedAssetPurchases.id, purchase.id), eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId)));
              await tx.delete(debts).where(and(eq(debts.id, purchase.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId)));
            } else if (purchase) {
              await tx.delete(financedAssetPurchases).where(and(eq(financedAssetPurchases.id, purchase.id), eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId)));
            }
            await tx.delete(investmentOperations).where(and(eq(investmentOperations.investmentId, input.id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId)));
            await tx.delete(investments).where(and(eq(investments.id, input.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        statusSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "paused", "closed"]) })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede cambiar el estado de una posición." });
          const db = await requireDb();
          const [asset] = await db.select({ id: investments.id }).from(investments).where(and(eq(investments.id, input.id), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "La posición no pertenece a tu espacio privado." });
          await db.update(investments).set({ status: input.status }).where(and(eq(investments.id, input.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          return { success: true };
        }),
        operationSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), investmentId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), type: z.enum(["contribution", "withdrawal", "yield", "valuation_adjustment", "depreciation"]), amountCents: z.number().int().positive(), currency: z.string().length(3), occurredAt: z.number().int().positive(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar operaciones de inversión." });
          const db = await requireDb();
          const [investment] = await db.select().from(investments).where(and(eq(investments.id, input.investmentId), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!investment) throw new TRPCError({ code: "NOT_FOUND", message: "La posición no pertenece a tu espacio privado." });
          if (investment.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "La operación debe usar la moneda de la posición." });
          if (input.linkedTransactionId) {
            const [transaction] = await db.select().from(financialTransactions).where(and(eq(financialTransactions.id, input.linkedTransactionId), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!transaction || transaction.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El movimiento vinculado debe pertenecer a tu espacio y usar la misma moneda." });
            const transactionIds = transaction.transferGroupId
              ? (await db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId), eq(financialTransactions.transferGroupId, transaction.transferGroupId)))).map(row => row.id)
              : [transaction.id];
            const duplicateLink = await db.select({ id: investmentOperations.id }).from(investmentOperations).where(and(eq(investmentOperations.userId, ctx.workspaceAccess.ownerId), inArray(investmentOperations.linkedTransactionId, transactionIds))).limit(1);
            if (duplicateLink[0] && duplicateLink[0].id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "Ese movimiento ya está vinculado a una aportación; revisa el historial de la posición antes de registrar otra." });
          }
          const { id, occurredAt, ...values } = input; const payload = { ...values, occurredAt: new Date(occurredAt) };
          await db.transaction(async tx => {
            let previous: typeof investmentOperations.$inferSelect | undefined;
            if (id) {
              const rows = await tx.select().from(investmentOperations).where(and(eq(investmentOperations.id, id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId))).limit(1);
              previous = rows[0];
              if (!previous || previous.investmentId !== investment.id) throw new TRPCError({ code: "NOT_FOUND", message: "La operación no pertenece a esta posición." });
              await tx.update(investmentOperations).set(payload).where(and(eq(investmentOperations.id, id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId)));
            } else {
              await tx.insert(investmentOperations).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
            }
            const nextDelta = investmentOperationDelta(input.type, input.amountCents);
            const previousDelta = previous ? investmentOperationDelta(previous.type, previous.amountCents) : { costBasisCents: 0, currentValueCents: 0 };
            const nextValues = applyInvestmentDelta(investment, { costBasisCents: nextDelta.costBasisCents - previousDelta.costBasisCents, currentValueCents: nextDelta.currentValueCents - previousDelta.currentValueCents });
            await tx.update(investments).set({ ...nextValues, valuationDate: new Date(Math.max(investment.valuationDate?.getTime() ?? 0, occurredAt)) }).where(and(eq(investments.id, investment.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        reconcile: workspaceFinanceProcedure.input(z.object({ investmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede reconciliar posiciones de inversión." });
          const db = await requireDb();
          const [investment] = await db.select().from(investments).where(and(eq(investments.id, input.investmentId), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!investment) throw new TRPCError({ code: "NOT_FOUND", message: "La posición no pertenece a tu espacio privado." });
          const history = await db.select({ type: investmentOperations.type, amountCents: investmentOperations.amountCents, occurredAt: investmentOperations.occurredAt }).from(investmentOperations).where(and(eq(investmentOperations.investmentId, investment.id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId)));
          const totals = totalsFromInvestmentOperations(history);
          const lastOccurredAt = history.reduce<Date | null>((latest, operation) => !latest || operation.occurredAt > latest ? operation.occurredAt : latest, investment.valuationDate);
          await db.update(investments).set({ ...totals, valuationDate: lastOccurredAt }).where(and(eq(investments.id, investment.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          return { success: true, ...totals };
        }),
        operationRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar operaciones de inversión." });
          const db = await requireDb();
          await db.transaction(async tx => {
            const [operation] = await tx.select().from(investmentOperations).where(and(eq(investmentOperations.id, input.id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!operation) throw new TRPCError({ code: "NOT_FOUND", message: "La operación no pertenece a tu espacio privado." });
            const [investment] = await tx.select().from(investments).where(and(eq(investments.id, operation.investmentId), eq(investments.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!investment) throw new TRPCError({ code: "NOT_FOUND", message: "La posición no pertenece a tu espacio privado." });
            const delta = investmentOperationDelta(operation.type, operation.amountCents);
            const nextValues = applyInvestmentDelta(investment, { costBasisCents: -delta.costBasisCents, currentValueCents: -delta.currentValueCents });
            await tx.delete(investmentOperations).where(eq(investmentOperations.id, operation.id));
            await tx.update(investments).set(nextValues).where(and(eq(investments.id, investment.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
      }),
      financedAssets: router({
        list: workspaceFinanceProcedure.query(async ({ ctx }) => {
          const db = await requireDb();
          const [purchases, assetRows, debtRows, paymentRows, adjustmentRows] = await Promise.all([
            db.select().from(financedAssetPurchases).where(eq(financedAssetPurchases.userId, ctx.workspaceAccess.ownerId)),
            db.select().from(investments).where(eq(investments.userId, ctx.workspaceAccess.ownerId)),
            db.select().from(debts).where(eq(debts.userId, ctx.workspaceAccess.ownerId)),
            db.select().from(debtPayments).where(eq(debtPayments.userId, ctx.workspaceAccess.ownerId)),
            db.select().from(debtBalanceAdjustments).where(eq(debtBalanceAdjustments.userId, ctx.workspaceAccess.ownerId)),
          ]);
          return purchases.map(purchase => {
            const debt = purchase.debtId ? debtRows.find(item => item.id === purchase.debtId) ?? null : null;
            const payments = debt ? paymentRows.filter(item => item.debtId === debt.id) : [];
            const adjustments = debt ? adjustmentRows.filter(item => item.debtId === debt.id) : [];
            return {
              ...purchase,
              asset: assetRows.find(asset => asset.id === purchase.investmentId) ?? null,
              debt: debt ? {
                ...debt,
                capitalPaidCents: payments.reduce((sum, item) => sum + item.principalCents, 0),
                interestPaidCents: payments.reduce((sum, item) => sum + item.interestCents + item.lateInterestCents, 0),
                lateInterestPaidCents: payments.reduce((sum, item) => sum + item.lateInterestCents, 0),
                interestGeneratedCents: payments.reduce((sum, item) => sum + item.interestCents + item.lateInterestCents, 0) + adjustments.filter(item => item.type === "late_interest").reduce((sum, item) => sum + Math.max(0, item.amountCents), 0),
                manualChargesCents: adjustments.reduce((sum, item) => sum + (item.type === "correction" ? 0 : Math.max(0, item.amountCents)), 0),
              } : null,
            };
          });
        }),
        create: workspaceFinanceProcedure.input(z.object({
          entityId: z.number().int().positive().nullable().optional(),
          projectId: z.number().int().positive().nullable().optional(),
          sourceAccountId: z.number().int().positive().nullable().optional(),
          name: z.string().trim().min(2).max(180),
          assetType: z.enum(["vehicle", "property", "land", "other"]),
          institution: z.string().trim().max(180).nullable().optional(),
          scope: scopeSchema,
          currency: z.string().length(3),
          purchaseValueCents: z.number().int().positive(),
          cashContributionCents: moneySchema,
          acquiredAt: z.number().int().positive(),
          valuationPolicy: z.enum(["depreciating", "appreciating", "manual"]),
          creditor: z.string().trim().max(140).nullable().optional(),
          installmentCents: moneySchema,
          installmentCount: z.number().int().positive().max(600).nullable().optional(),
          interestRateBps: z.number().int().min(0).nullable().optional(),
          nextDueAt: optionalDate,
          endDate: optionalDate,
          notes: z.string().max(3000).nullable().optional(),
        })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar activos financiados." });
          if (input.cashContributionCents >= input.purchaseValueCents) throw new TRPCError({ code: "BAD_REQUEST", message: "Para este flujo financiado, el anticipo debe ser menor que el valor de adquisición." });
          if (input.cashContributionCents > 0 && !input.sourceAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Indica la cuenta desde la que pagaste el anticipo." });
          if (input.installmentCents > 0 && !input.installmentCount) throw new TRPCError({ code: "BAD_REQUEST", message: "Indica el número de mensualidades de la financiación." });
          const db = await requireDb();
          const financedAmountCents = input.purchaseValueCents - input.cashContributionCents;
          const source = input.sourceAccountId
            ? (await db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1))[0]
            : null;
          if (input.sourceAccountId && (!source || source.status !== "active" || source.currency !== input.currency)) throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta del anticipo debe estar activa, pertenecer a tu espacio y usar la misma moneda." });
          const loanKind = input.assetType === "vehicle" ? "automotive" : input.assetType === "property" ? "mortgage" : "not_specified";
          const debtType = input.assetType === "property" ? "mortgage" : "financed_purchase";
          const acquiredAt = new Date(input.acquiredAt);
          const downPaymentTransferGroupId = input.cashContributionCents > 0 ? randomUUID() : null;
          await db.transaction(async tx => {
            const assetResult = await tx.insert(investments).values({
              userId: ctx.workspaceAccess.ownerId, entityId: input.entityId ?? null, projectId: input.projectId ?? null, goalId: null,
              name: input.name, type: input.assetType, institution: input.institution ?? null, scope: input.scope,
              currency: input.currency, costBasisCents: input.purchaseValueCents, currentValueCents: input.purchaseValueCents,
              reportCurrency: null, reportValueCents: null, exchangeRateMicros: null, exchangeRateDate: null,
              valuationDate: acquiredAt, includeInNetWorth: true, status: "active", notes: input.notes ?? null,
            });
            const assetId = Number((Array.isArray(assetResult) ? assetResult[0] : assetResult as unknown as { insertId?: number }).insertId);
            if (!Number.isInteger(assetId) || assetId <= 0) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo vincular el activo recién creado." });
            const debtResult = await tx.insert(debts).values({
              userId: ctx.workspaceAccess.ownerId, entityId: input.entityId ?? null, projectId: input.projectId ?? null, contactId: null,
              name: `Financiación · ${input.name}`, creditor: input.creditor ?? null, type: debtType, loanKind, scope: input.scope,
              balanceCents: financedAmountCents, originalAmountCents: financedAmountCents, installmentCents: input.installmentCents || null,
              installmentCount: input.installmentCount ?? null, financedItem: input.name, purchasedAt: acquiredAt, currency: input.currency,
              interestRateBps: input.interestRateBps ?? null, minimumPaymentCents: input.installmentCents, nextDueAt: asDate(input.nextDueAt),
              endDate: asDate(input.endDate), priority: "medium", status: "active", notes: input.notes ?? null,
            });
            const debtId = Number((Array.isArray(debtResult) ? debtResult[0] : debtResult as unknown as { insertId?: number }).insertId);
            if (!Number.isInteger(debtId) || debtId <= 0) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo vincular la financiación recién creada." });
            if (input.cashContributionCents > 0 && source && downPaymentTransferGroupId) {
              await tx.insert(financialTransactions).values([
                {
                  userId: ctx.workspaceAccess.ownerId, entityId: source.entityId, projectId: input.projectId ?? source.projectId,
                  accountId: source.id, categoryId: null, goalId: null, investmentId: null, debtId: null, creditCardId: null, contactId: null,
                  type: "transfer_out", scope: source.scope, amountCents: input.cashContributionCents, currency: input.currency,
                  reportCurrency: input.currency, reportAmountCents: input.cashContributionCents, exchangeRateMicros: null, exchangeRateDate: null,
                  incomeNature: "other", occurredAt: acquiredAt, isEssential: false, transferGroupId: downPaymentTransferGroupId,
                  status: "confirmed", reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(),
                  notes: `Anticipo de ${input.name}`,
                },
                {
                  userId: ctx.workspaceAccess.ownerId, entityId: input.entityId ?? null, projectId: input.projectId ?? null,
                  accountId: null, categoryId: null, goalId: null, investmentId: assetId, debtId: null, creditCardId: null, contactId: null,
                  type: "transfer_in", scope: input.scope, amountCents: input.cashContributionCents, currency: input.currency,
                  reportCurrency: input.currency, reportAmountCents: input.cashContributionCents, exchangeRateMicros: null, exchangeRateDate: null,
                  incomeNature: "other", occurredAt: acquiredAt, isEssential: false, transferGroupId: downPaymentTransferGroupId,
                  status: "confirmed", reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(),
                  notes: `Anticipo recibido en activo · ${input.name}`,
                },
              ]);
            }
            await tx.insert(financedAssetPurchases).values({
              userId: ctx.workspaceAccess.ownerId, investmentId: assetId, debtId, sourceAccountId: input.sourceAccountId ?? null, downPaymentTransferGroupId,
              purchaseValueCents: input.purchaseValueCents, cashContributionCents: input.cashContributionCents, financedAmountCents,
              acquiredAt, valuationPolicy: input.valuationPolicy, notes: input.notes ?? null,
            });
          });
          return { success: true };
        }),
      }),
      recurringTemplates: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), accountId: z.number().int().positive().nullable().optional(), creditCardId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(180), counterparty: z.string().trim().max(180).nullable().optional(), type: z.enum(["income", "expense"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), cadence: z.enum(["weekly", "monthly", "quarterly", "annual"]), nextOccurrenceAt: optionalDate, status: z.enum(["active", "paused"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar plantillas recurrentes." });
          const db = await requireDb(); const { id, nextOccurrenceAt, ...values } = input;
          if (values.contactId) {
            const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
          }
          if (values.creditCardId) {
            if (values.type !== "expense" || values.accountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Una tarjeta sólo puede asociarse a una plantilla de gasto sin cuenta de pago simultánea." });
            const [card] = await db.select().from(creditCards).where(and(eq(creditCards.id, values.creditCardId), eq(creditCards.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!card || card.status !== "active" || card.currency !== values.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "La tarjeta debe estar activa, pertenecer a tu espacio y usar la misma moneda que la plantilla." });
          }
          const payload = { ...values, nextOccurrenceAt: asDate(nextOccurrenceAt) };
          if (id) await db.update(recurringTemplates).set(payload).where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(recurringTemplates).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar plantillas recurrentes." });
          const db = await requireDb(); await db.delete(recurringTemplates).where(and(eq(recurringTemplates.id, input.id), eq(recurringTemplates.userId, ctx.workspaceAccess.ownerId))); return { success: true };
        }),
        applyNow: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive(), occurredAt: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede aplicar plantillas recurrentes." });
          const db = await requireDb();
          const [template] = await db.select().from(recurringTemplates).where(and(eq(recurringTemplates.id, input.id), eq(recurringTemplates.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!template || template.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "La plantilla activa no pertenece a tu espacio." });
          await db.insert(financialTransactions).values({ userId: ctx.workspaceAccess.ownerId, accountId: template.creditCardId ? null : template.accountId, categoryId: template.categoryId, goalId: null, debtId: null, creditCardId: template.creditCardId, contactId: template.contactId, entityId: template.entityId, projectId: template.projectId, type: template.type, scope: template.scope, amountCents: template.amountCents, currency: template.currency, reportCurrency: template.currency, reportAmountCents: template.amountCents, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: template.incomeNature, occurredAt: new Date(input.occurredAt), isEssential: false, transferGroupId: null, status: "confirmed", reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: [template.name, template.counterparty].filter(Boolean).join(" · ") || template.notes });
          return { success: true };
        }),
      }),
      imports: router({
        preview: workspaceFinanceProcedure.input(z.object({ rows: z.array(importRowSchema).min(1).max(300) })).mutation(async ({ ctx, input }) => {
          const db = await requireDb();
          const existing = await db.select().from(financialTransactions).where(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId));
          return input.rows.map((row, index) => ({ index, possibleDuplicateIds: findPossibleDuplicates({ ...row, occurredAt: new Date(row.occurredAt), accountId: row.accountId ?? null, notes: row.notes ?? null }, existing), row }));
        }),
        confirm: workspaceFinanceProcedure.input(z.object({ rows: z.array(importRowSchema).min(1).max(300) })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canCreateDrafts) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite confirmar importaciones." });
          const db = await requireDb();
          const isOwner = ctx.workspaceAccess.role === "owner";
          const result = await db.transaction(async tx => {
            const existing = await tx.select().from(financialTransactions).where(eq(financialTransactions.userId, ctx.workspaceAccess.ownerId));
            const blocked = input.rows.flatMap((row, index) => {
              const possibleDuplicateIds = findPossibleDuplicates({ ...row, occurredAt: new Date(row.occurredAt), accountId: row.accountId ?? null, notes: row.notes ?? null }, existing);
              return possibleDuplicateIds.length && !row.allowPossibleDuplicate ? [{ index, possibleDuplicateIds }] : [];
            });
            if (blocked.length) throw new TRPCError({ code: "CONFLICT", message: "Hay filas que coinciden con movimientos existentes. Revísalas y confirma cada duplicado que quieras conservar.", cause: blocked });
            const values = input.rows.map(({ occurredAt, exchangeRateDate, allowPossibleDuplicate, ...row }) => ({ userId: ctx.workspaceAccess.ownerId, ...row, accountId: row.accountId ?? null, categoryId: row.categoryId ?? null, entityId: row.entityId ?? null, projectId: row.projectId ?? null, goalId: null, debtId: null, occurredAt: new Date(occurredAt), exchangeRateDate: asDate(exchangeRateDate), transferGroupId: null, reviewStatus: isOwner ? "approved" as const : "pending_review" as const, status: isOwner ? row.status : "needs_review" as const, createdByUserId: ctx.user.id, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null }));
            await tx.insert(financialTransactions).values(values);
            return { importedCount: values.length };
          });
          return { success: true, ...result };
        }),
      }),
      reviewTransaction: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive(), approve: z.boolean() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canReview) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite revisar movimientos." });
        const db = await requireDb();
        await db.update(financialTransactions).set({ reviewStatus: input.approve ? "approved" : "draft", status: input.approve ? "confirmed" : "needs_review", reviewedByUserId: ctx.user.id, reviewedAt: new Date() }).where(and(eq(financialTransactions.id, input.id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
    }),
    profile: router({
      get: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
      save: privateFinanceProcedure.input(z.object({
        currency: z.string().length(3).default("MXN"),
        displayName: z.string().trim().min(1).max(140).nullable().optional(),
        birthDate: optionalDate,
        residenceCity: z.string().trim().max(120).nullable().optional(),
        contactEmail: z.string().trim().email().max(320).nullable().optional(),
        personalProfileConsent: z.boolean().optional(),
        residenceCountry: z.string().max(80).nullable().optional(),
        taxResidence: z.string().max(120).nullable().optional(),
        householdSize: z.number().int().min(1).default(1),
        dependents: z.number().int().min(0).default(0),
        minimumLiquidityCents: moneySchema.default(0),
        referenceEssentialExpensesCents: moneySchema.default(0),
        futureTaxReserveCents: moneySchema.default(0),
        futureTaxDueAt: optionalDate,
        riskTolerance: z.enum(["low", "medium_low", "medium", "medium_high", "high"]).nullable().optional(),
        notes: z.string().max(3000).nullable().optional(),
      })).mutation(async ({ ctx, input }) => {
        if (requiresPersonalProfileConsent(input, input.personalProfileConsent)) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirma el consentimiento para guardar datos personales privados." });
        const db = await requireDb();
        const { futureTaxDueAt, birthDate, ...profileValues } = input;
        await db.insert(financialProfiles).values({ userId: ctx.user.id, ...profileValues, birthDate: asDate(birthDate), futureTaxDueAt: asDate(futureTaxDueAt) }).onDuplicateKeyUpdate({ set: { ...profileValues, birthDate: asDate(birthDate), futureTaxDueAt: asDate(futureTaxDueAt) } });
        return { success: true };
      }),
      uploadAvatar: privateFinanceProcedure.input(z.object({ dataUrl: z.string().min(32).max(1_600_000), confirmedPersonalDataConsent: z.literal(true) })).mutation(async ({ ctx, input }) => {
        const match = input.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona una imagen PNG, JPEG o WebP válida." });
        const bytes = Buffer.from(match[2], "base64");
        if (bytes.length > 1_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "La foto debe pesar menos de 1 MB." });
        const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
        const uploaded = await storagePut(`profiles/${ctx.user.id}/avatar.${extension}`, bytes, match[1]);
        const db = await requireDb();
        await db.insert(financialProfiles).values({ userId: ctx.user.id, avatarKey: uploaded.key, avatarUrl: uploaded.url, personalProfileConsent: true }).onDuplicateKeyUpdate({ set: { avatarKey: uploaded.key, avatarUrl: uploaded.url, personalProfileConsent: true } });
        return { url: uploaded.url };
      }),
      removeAvatar: privateFinanceProcedure.mutation(async ({ ctx }) => {
        const db = await requireDb();
        await db.update(financialProfiles).set({ avatarKey: null, avatarUrl: null }).where(eq(financialProfiles.userId, ctx.user.id));
        return { success: true };
      }),
    }),
    notifications: router({
      get: privateFinanceProcedure.query(async ({ ctx }) => {
        const db = await requireDb();
        const [storedPreferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
        const preferences = storedPreferences ?? defaultNotificationPreferences;
        const existing = await db.select().from(financeNotifications).where(eq(financeNotifications.userId, ctx.user.id));
        const resolvedCount = existing.filter(notification => notification.readAt || notification.dismissedAt).length;
        if (!preferences.inAppEnabled) return { preferences, notifications: [], resolvedCount };
        const visibleTypes = visibleNotificationTypes(preferences);
        return { preferences, notifications: existing.filter(notification => !notification.dismissedAt && visibleTypes.has(notification.type)).sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()), resolvedCount };
      }),
      refreshInbox: privateFinanceProcedure.mutation(async ({ ctx }) => {
        const db = await requireDb();
        const [storedPreferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
        const preferences = storedPreferences ?? defaultNotificationPreferences;
        if (!preferences.inAppEnabled) return { createdCount: 0, skipped: "in-app-disabled" as const };
        const candidates = buildNotificationCandidates(await getFinanceSnapshot(ctx.user.id), preferences);
        const existing = await db.select().from(financeNotifications).where(eq(financeNotifications.userId, ctx.user.id));
        const existingKeys = new Set(existing.map(notification => `${notification.type}:${notification.relatedEntityType}:${notification.relatedEntityId}`));
        const pending = candidates.filter(candidate => !existingKeys.has(`${candidate.type}:${candidate.relatedEntityType}:${candidate.relatedEntityId}`));
        if (pending.length) await db.insert(financeNotifications).values(pending.map(candidate => ({ userId: ctx.user.id, ...candidate })));
        return { createdCount: pending.length, skipped: null };
      }),
      savePreferences: privateFinanceProcedure.input(z.object({ inAppEnabled: z.boolean(), calendarEnabled: z.boolean(), documentsEnabled: z.boolean(), debtsEnabled: z.boolean(), reviewsEnabled: z.boolean(), budgetEnabled: z.boolean(), taxReserveEnabled: z.boolean(), travelsEnabled: z.boolean(), reminderDays: z.number().int().min(1).max(30), creditUtilizationThresholdPercent: z.number().int().min(1).max(100) })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.insert(notificationPreferences).values({ userId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: input });
        return { success: true };
      }),
      setTelegramDaily: privateFinanceProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [storedPreferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
        if (input.enabled && !storedPreferences?.telegramScheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telegram aún no tiene una programación diaria válida. La integración se habilitará cuando termine su configuración segura." });
        await db.insert(notificationPreferences).values({ userId: ctx.user.id, telegramEnabled: input.enabled }).onDuplicateKeyUpdate({ set: { telegramEnabled: input.enabled } });
        return { success: true };
      }),
      markRead: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); await db.update(financeNotifications).set({ readAt: new Date() }).where(and(eq(financeNotifications.id, input.id), eq(financeNotifications.userId, ctx.user.id))); return { success: true };
      }),
      dismiss: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); await db.update(financeNotifications).set({ dismissedAt: new Date() }).where(and(eq(financeNotifications.id, input.id), eq(financeNotifications.userId, ctx.user.id))); return { success: true };
      }),
      clearResolved: privateFinanceProcedure.input(z.object({ confirmed: z.literal(true) })).mutation(async ({ ctx }) => {
        const db = await requireDb();
        await db.delete(financeNotifications).where(and(eq(financeNotifications.userId, ctx.user.id), or(isNotNull(financeNotifications.readAt), isNotNull(financeNotifications.dismissedAt))));
        return { success: true };
      }),
    }),
    quality: router({
      acknowledge: privateFinanceProcedure.input(z.object({ issueKey: z.string().min(3).max(512) })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const existing = await db.select({ id: qualityIssueAcknowledgements.id }).from(qualityIssueAcknowledgements).where(and(eq(qualityIssueAcknowledgements.userId, ctx.user.id), eq(qualityIssueAcknowledgements.issueKey, input.issueKey))).limit(1);
        if (!existing[0]) await db.insert(qualityIssueAcknowledgements).values({ userId: ctx.user.id, issueKey: input.issueKey });
        return { success: true };
      }),
      reopen: privateFinanceProcedure.input(z.object({ issueKey: z.string().min(3).max(512) })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.delete(qualityIssueAcknowledgements).where(and(eq(qualityIssueAcknowledgements.userId, ctx.user.id), eq(qualityIssueAcknowledgements.issueKey, input.issueKey)));
        return { success: true };
      }),
    }),
    privacy: router({
      listConsents: protectedProcedure.query(async ({ ctx }) => {
        const db = await requireDb();
        return db.select().from(privacyConsents).where(eq(privacyConsents.userId, ctx.user.id));
      }),
      recordConsent: protectedProcedure.input(z.object({
        accepted: z.literal(true),
        policyVersion: z.string().min(1).max(40),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.insert(privacyConsents).values({
          userId: ctx.user.id,
          purpose: "almacenamiento_manual_financiero",
          accepted: input.accepted,
          policyVersion: input.policyVersion,
        });
        return { success: true };
      }),
      recordOfflineVaultConsent: protectedProcedure.input(z.object({
        accepted: z.boolean(),
        policyVersion: z.string().min(1).max(40),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.insert(privacyConsents).values({
          userId: ctx.user.id,
          purpose: "boveda_offline_cifrada_personal",
          accepted: input.accepted,
          policyVersion: input.policyVersion,
        });
        return { success: true };
      }),
      deleteAll: protectedProcedure.input(z.object({ confirmation: z.literal("BORRAR") })).mutation(async ({ ctx }) => {
        await deleteAllFinancialData(ctx.user.id);
        return { success: true };
      }),
    }),
    accounts: router({
      save: privateFinanceProcedure.input(z.object({
        id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().min(1).max(140),
        type: z.enum(["cash", "bank", "investment", "pension", "property", "business", "other"]),
        scope: scopeSchema, currency: z.string().length(3), currentValueCents: moneySchema,
        isLiquid: z.boolean(), valuationDate: optionalDate, status: z.enum(["active", "closed"]).default("active"), notes: z.string().max(3000).nullable().optional(),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const { id, valuationDate, ...values } = input;
        const payload = { ...values, valuationDate: asDate(valuationDate) };
        if (id) await db.update(accounts).set(payload).where(and(eq(accounts.id, id), eq(accounts.userId, ctx.user.id)));
        else await db.insert(accounts).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(accounts, input.id, ctx.user.id)),
    }),
    categories: router({
      save: privateFinanceProcedure.input(z.object({
        id: z.number().int().positive().optional(), name: z.string().min(1).max(120), type: z.enum(["income", "expense", "transfer", "mixed"]), scope: scopeSchema, isEssential: z.boolean(), isActive: z.boolean(),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const { id, ...payload } = input;
        if (id) await db.update(categories).set(payload).where(and(eq(categories.id, id), eq(categories.userId, ctx.user.id)));
        else await db.insert(categories).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(categories, input.id, ctx.user.id)),
    }),
    score: router({
      overview: workspaceFinanceProcedure.input(dashboardPeriodInput).query(async ({ ctx, input }) => {
        const referenceDate = input?.referenceDate ? new Date(`${input.referenceDate}T12:00:00.000Z`) : new Date();
        const snapshot = await getFinanceSnapshot(ctx.user.id, referenceDate);
        const db = await requireDb();
        const creditReportRows = await db.select().from(creditReports).where(eq(creditReports.userId, ctx.workspaceAccess.ownerId)).orderBy(desc(creditReports.consultedAt));
        return { ...scoreFromSnapshot(snapshot, referenceDate), reportCurrency: snapshot.dashboard.reportCurrency, referenceDate, creditRecords: snapshot.creditScoreRecords, snapshots: snapshot.personalScoreSnapshots, creditReports: creditReportRows };
      }),
      saveCreditRecord: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), score: z.number().int().min(0).max(1000), source: z.string().trim().max(120).nullable().optional(), reportedAt: z.number().int().positive(), notes: z.string().trim().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede guardar el score crediticio manual." });
        const db = await requireDb(); const { id, reportedAt, ...values } = input; const payload = { ...values, reportedAt: new Date(reportedAt) };
        if (id) await db.update(creditScoreRecords).set(payload).where(and(eq(creditScoreRecords.id, id), eq(creditScoreRecords.userId, ctx.workspaceAccess.ownerId)));
        else await db.insert(creditScoreRecords).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      removeCreditRecord: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar el score crediticio manual." });
        const db = await requireDb(); await db.delete(creditScoreRecords).where(and(eq(creditScoreRecords.id, input.id), eq(creditScoreRecords.userId, ctx.workspaceAccess.ownerId))); return { success: true };
      }),
      saveCreditReport: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), provider: z.enum(["buro", "circulo"]), consultedAt: z.number().int().positive(), reportedScore: z.number().int().min(0).max(1000).nullable().optional(), periodLabel: z.string().trim().max(80).nullable().optional(), notes: z.string().trim().max(3000).nullable().optional(), fileUpload: z.object({ fileName: z.string().min(1).max(240), mimeType: z.string().max(120), base64: z.string().min(8).max(14_000_000) }).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede guardar informes crediticios." });
        const db = await requireDb(); const { id, fileUpload, consultedAt, ...values } = input;
        if (id && !fileUpload) { await db.update(creditReports).set({ ...values, consultedAt: new Date(consultedAt) }).where(and(eq(creditReports.id, id), eq(creditReports.userId, ctx.workspaceAccess.ownerId))); return { success: true }; }
        if (!fileUpload) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un informe PDF para crear el registro." });
        const { bytes, safeFileName } = decodePdfUpload(fileUpload); const { key, url } = await storagePut(`credit-reports/${ctx.workspaceAccess.ownerId}/${randomUUID()}-${safeFileName}`, bytes, "application/pdf");
        const payload = { ...values, consultedAt: new Date(consultedAt), fileKey: key, fileUrl: url, fileName: safeFileName, fileMimeType: "application/pdf", fileSizeBytes: bytes.byteLength, status: "active" as const, archivedAt: null };
        if (id) await db.update(creditReports).set(payload).where(and(eq(creditReports.id, id), eq(creditReports.userId, ctx.workspaceAccess.ownerId))); else await db.insert(creditReports).values({ userId: ctx.workspaceAccess.ownerId, ...payload }); return { success: true };
      }),
      archiveCreditReport: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede archivar informes crediticios." }); const db = await requireDb(); await db.update(creditReports).set({ status: "archived", archivedAt: new Date() }).where(and(eq(creditReports.id, input.id), eq(creditReports.userId, ctx.workspaceAccess.ownerId))); return { success: true }; }),
      restoreCreditReport: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede restaurar informes crediticios." }); const db = await requireDb(); await db.update(creditReports).set({ status: "active", archivedAt: null }).where(and(eq(creditReports.id, input.id), eq(creditReports.userId, ctx.workspaceAccess.ownerId))); return { success: true }; }),
      removeCreditReport: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar informes crediticios." }); const db = await requireDb(); await db.delete(creditReports).where(and(eq(creditReports.id, input.id), eq(creditReports.userId, ctx.workspaceAccess.ownerId))); return { success: true }; }),
      saveSnapshot: workspaceFinanceProcedure.input(z.object({ referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().trim().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede guardar un corte de score." });
        const referenceDate = input.referenceDate ? new Date(`${input.referenceDate}T12:00:00.000Z`) : new Date();
        const snapshot = await getFinanceSnapshot(ctx.user.id, referenceDate); const score = scoreFromSnapshot(snapshot, referenceDate); const { start } = monthBounds(referenceDate);
        const db = await requireDb();
        await db.insert(personalScoreSnapshots).values({ userId: ctx.workspaceAccess.ownerId, calculatedAt: referenceDate, periodStart: start, totalScore: score.totalScore, level: score.level, ...score.factors, notes: input.notes ?? null });
        return { success: true, ...score };
      }),
    }),
    transactions: router({
      save: privateFinanceProcedure.input(z.object({
        id: z.number().int().positive().optional(), accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(),
        type: z.enum(["income", "expense", "transfer_out", "transfer_in"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), occurredAt: z.number().int().positive(), isEssential: z.boolean(), transferGroupId: z.string().max(64).nullable().optional(), status: z.enum(["confirmed", "estimated", "needs_review"]), bankReference: z.string().trim().max(160).nullable().optional(), notes: z.string().max(3000).nullable().optional(),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const { id, occurredAt, ...values } = input;
        const payload = { ...values, occurredAt: new Date(occurredAt) };
        if (id) await db.update(financialTransactions).set(payload).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, ctx.user.id)));
        else await db.insert(financialTransactions).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [transaction] = await db.select().from(financialTransactions).where(and(eq(financialTransactions.id, input.id), eq(financialTransactions.userId, ctx.user.id))).limit(1);
        if (transaction?.transferGroupId) throw new TRPCError({ code: "BAD_REQUEST", message: "Elimina el traspaso completo desde el flujo de traspasos para mantener ambas cuentas coherentes." });
        await db.transaction(async tx => {
          if (transaction?.creditCardId && transaction.type === "expense") {
            const [card] = await tx.select().from(creditCards).where(and(eq(creditCards.id, transaction.creditCardId), eq(creditCards.userId, ctx.user.id))).limit(1);
            if (card) await tx.update(creditCards).set({ balanceCents: Math.max(0, card.balanceCents - transaction.amountCents) }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.user.id)));
          }
          await tx.update(financeTasks).set({ linkedTransactionId: null }).where(and(eq(financeTasks.userId, ctx.user.id), eq(financeTasks.linkedTransactionId, input.id)));
          await tx.delete(financialTransactions).where(and(eq(financialTransactions.id, input.id), eq(financialTransactions.userId, ctx.user.id)));
        });
        return { success: true };
      }),
      removeMany: privateFinanceProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const rows = await db.select().from(financialTransactions).where(and(eq(financialTransactions.userId, ctx.user.id), inArray(financialTransactions.id, input.ids)));
        if (rows.some(row => row.transferGroupId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Los traspasos deben eliminarse completos desde el flujo de traspasos." });
        await db.transaction(async tx => {
          for (const transaction of rows) {
            if (transaction.creditCardId && transaction.type === "expense") {
              const [card] = await tx.select().from(creditCards).where(and(eq(creditCards.id, transaction.creditCardId), eq(creditCards.userId, ctx.user.id))).limit(1);
              if (card) await tx.update(creditCards).set({ balanceCents: Math.max(0, card.balanceCents - transaction.amountCents) }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.user.id)));
            }
            await tx.update(financeTasks).set({ linkedTransactionId: null }).where(and(eq(financeTasks.userId, ctx.user.id), eq(financeTasks.linkedTransactionId, transaction.id)));
          }
          if (rows.length) await tx.delete(financialTransactions).where(and(eq(financialTransactions.userId, ctx.user.id), inArray(financialTransactions.id, rows.map(row => row.id))));
        });
        return { success: true, deletedCount: rows.length };
      }),
    }),
    documents: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().min(1).max(180), type: z.enum(["statement", "invoice", "contract", "policy", "tax", "receipt", "other"]), documentClass: z.enum(["general", "identity_residency", "tax_residency", "tax_filing", "insurance", "will_estate", "property", "investment_instrument", "loan_credit", "legal_contract"]).default("general"), scope: scopeSchema, relatedEntityType: z.enum(["none", "asset", "debt", "insurance", "tax", "estate"]).default("none"), relatedEntityId: z.number().int().positive().nullable().optional(), jurisdiction: z.string().max(120).nullable().optional(), referenceUrl: z.string().url().nullable().optional(), referenceProvider: z.enum(["google_drive", "url", "other"]).default("url"), fileUpload: z.object({ fileName: z.string().min(1).max(240), mimeType: z.string().max(120), base64: z.string().min(8).max(14_000_000) }).nullable().optional(), removeStoredFile: z.boolean().optional(), issuedAt: optionalDate, expiresAt: optionalDate, reminderAt: optionalDate, verified: z.boolean(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, issuedAt, expiresAt, reminderAt, fileUpload, removeStoredFile, ...values } = input;
        let filePayload: Record<string, string | number | null> = {};
        if (fileUpload) {
          const { bytes, safeFileName } = decodePdfUpload(fileUpload);
          const { key, url } = await storagePut(`documents/${ctx.user.id}/${randomUUID()}-${safeFileName}`, bytes, "application/pdf");
          filePayload = { fileKey: key, fileUrl: url, fileName: safeFileName, fileMimeType: "application/pdf", fileSizeBytes: bytes.byteLength };
        } else if (removeStoredFile) filePayload = { fileKey: null, fileUrl: null, fileName: null, fileMimeType: null, fileSizeBytes: null };
        const payload = { ...values, ...filePayload, issuedAt: asDate(issuedAt), expiresAt: asDate(expiresAt), reminderAt: asDate(reminderAt) };
        if (id) await db.update(financeDocuments).set(payload).where(and(eq(financeDocuments.id, id), eq(financeDocuments.userId, ctx.user.id)));
        else await db.insert(financeDocuments).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financeDocuments, input.id, ctx.user.id)),
    }),
    calendar: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), title: z.string().min(1).max(180), eventType: z.enum(["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other"]), scope: scopeSchema, startsAt: z.number().int().positive(), endsAt: optionalDate, recurrence: z.enum(["none", "monthly", "quarterly", "yearly"]), amountCents: moneySchema.nullable().optional(), currency: z.string().length(3), linkedDebtId: z.number().int().positive().nullable().optional(), linkedCreditCardId: z.number().int().positive().nullable().optional(), linkedDocumentId: z.number().int().positive().nullable().optional(), linkedTaskId: z.number().int().positive().nullable().optional(), status: z.enum(["planned", "completed", "cancelled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const canLinkCard = input.eventType === "credit_card_cutoff" || input.eventType === "credit_card_payment";
        if (input.linkedCreditCardId && !canLinkCard) throw new TRPCError({ code: "BAD_REQUEST", message: "Sólo los eventos de corte o pago de tarjeta pueden vincular una TDC." });
        if (input.linkedCreditCardId) {
          const [card] = await db.select({ id: creditCards.id }).from(creditCards).where(and(eq(creditCards.id, input.linkedCreditCardId), eq(creditCards.userId, ctx.user.id))).limit(1);
          if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "La tarjeta vinculada no pertenece a tu espacio privado." });
        }
        const { id, startsAt, endsAt, linkedCreditCardId, ...values } = input; const payload = { ...values, linkedCreditCardId: canLinkCard ? linkedCreditCardId ?? null : null, startsAt: new Date(startsAt), endsAt: asDate(endsAt) };
        if (id) await db.update(calendarEvents).set(payload).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, ctx.user.id)));
        else await db.insert(calendarEvents).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(calendarEvents, input.id, ctx.user.id)),
      saveColor: privateFinanceProcedure.input(z.object({ category: calendarColorCategorySchema, colorKey: calendarColorKeySchema })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const existing = await db.select({ id: calendarColorPreferences.id }).from(calendarColorPreferences).where(and(eq(calendarColorPreferences.userId, ctx.user.id), eq(calendarColorPreferences.category, input.category))).limit(1);
        if (existing[0]) await db.update(calendarColorPreferences).set({ colorKey: input.colorKey }).where(and(eq(calendarColorPreferences.id, existing[0].id), eq(calendarColorPreferences.userId, ctx.user.id)));
        else await db.insert(calendarColorPreferences).values({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
      resetColor: privateFinanceProcedure.input(z.object({ category: calendarColorCategorySchema })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.delete(calendarColorPreferences).where(and(eq(calendarColorPreferences.userId, ctx.user.id), eq(calendarColorPreferences.category, input.category)));
        return { success: true };
      }),
    }),
    budgets: router({
        save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), scope: scopeSchema, periodStart: z.number().int().positive(), plannedCents: moneySchema, type: z.enum(["income", "expense", "savings", "investment"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, periodStart, ...values } = input; const payload = { ...values, periodStart: new Date(periodStart) };
        if (id) await db.update(budgets).set(payload).where(and(eq(budgets.id, id), eq(budgets.userId, ctx.user.id)));
        else await db.insert(budgets).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(budgets, input.id, ctx.user.id)),
    }),
    debts: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(140), creditor: z.string().trim().max(140).nullable().optional(), type: z.enum(["credit_card", "loan", "financed_purchase", "mortgage", "tax", "business", "family", "other"]), loanKind: z.enum(["not_specified", "personal", "automotive", "mortgage"]).default("not_specified"), scope: scopeSchema, balanceCents: moneySchema, originalAmountCents: moneySchema.nullable().optional(), installmentCents: moneySchema.nullable().optional(), installmentCount: z.number().int().positive().max(600).nullable().optional(), financedItem: z.string().trim().max(180).nullable().optional(), purchasedAt: optionalDate, currency: z.string().length(3), interestRateBps: z.number().int().min(0).nullable().optional(), moratoriumRateBps: z.number().int().min(0).max(100000).nullable().optional(), overdueSinceAt: optionalDate, minimumPaymentCents: moneySchema, nextDueAt: optionalDate, endDate: optionalDate, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["active", "paid", "review"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        if (input.type === "financed_purchase" && input.originalAmountCents !== null && input.originalAmountCents !== undefined && input.originalAmountCents < input.balanceCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe original no puede ser menor que el saldo pendiente registrado." });
        if (input.type === "financed_purchase" && input.installmentCents && !input.installmentCount) throw new TRPCError({ code: "BAD_REQUEST", message: "Indica cuántas mensualidades tiene la compra financiada." });
        const { id, nextDueAt, endDate, purchasedAt, overdueSinceAt, type, loanKind, originalAmountCents, installmentCents, installmentCount, financedItem, ...values } = input;
        const financing = type === "financed_purchase"
          ? { originalAmountCents: originalAmountCents ?? null, installmentCents: installmentCents ?? null, installmentCount: installmentCount ?? null, financedItem: financedItem || null, purchasedAt: asDate(purchasedAt) }
          : { originalAmountCents: null, installmentCents: null, installmentCount: null, financedItem: null, purchasedAt: null };
        const payload = { ...values, type, loanKind: normalizeLoanKind(type, loanKind), moratoriumRateBps: input.moratoriumRateBps ?? null, overdueSinceAt: asDate(overdueSinceAt), ...financing, nextDueAt: asDate(nextDueAt), endDate: asDate(endDate) };
        if (id) await db.update(debts).set(payload).where(and(eq(debts.id, id), eq(debts.userId, ctx.user.id)));
        else await db.insert(debts).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      archive: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [debt] = await db.select({ id: debts.id, balanceCents: debts.balanceCents }).from(debts).where(and(eq(debts.id, input.id), eq(debts.userId, ctx.user.id))).limit(1);
        if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
        if (debt.balanceCents !== 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Sólo puedes archivar una deuda con saldo cero. Registra el pago restante antes de archivarla." });
        await db.update(debts).set({ status: "paid" }).where(and(eq(debts.id, input.id), eq(debts.userId, ctx.user.id)));
        return { success: true };
      }),
      restore: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [debt] = await db.select({ id: debts.id }).from(debts).where(and(eq(debts.id, input.id), eq(debts.userId, ctx.user.id))).limit(1);
        if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
        await db.update(debts).set({ status: "active" }).where(and(eq(debts.id, input.id), eq(debts.userId, ctx.user.id)));
        return { success: true };
      }),
      paymentSave: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), debtId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), totalPaymentCents: z.number().int().positive(), principalCents: moneySchema, interestCents: moneySchema.optional(), lateInterestCents: moneySchema.optional(), feeCents: moneySchema.optional(), currency: z.string().length(3), paidAt: z.number().int().positive(), nextDueAt: optionalDate, notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const breakdown = { totalPaymentCents: input.totalPaymentCents, principalCents: input.principalCents, interestCents: input.interestCents ?? Math.max(0, input.totalPaymentCents - input.principalCents), lateInterestCents: input.lateInterestCents ?? 0, feeCents: input.feeCents ?? 0 };
        if (!debtPaymentBreakdownIsValid(breakdown)) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago total debe coincidir con capital, interés ordinario, interés vencido y cargos." });
        const db = await requireDb();
        await db.transaction(async tx => {
          const [debt] = await tx.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, ctx.user.id))).limit(1);
          if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
          if (debt.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago debe usar la misma moneda que la deuda." });
          const existing = await tx.select().from(debtPayments).where(and(eq(debtPayments.debtId, debt.id), eq(debtPayments.userId, ctx.user.id)));
          const previous = input.id ? existing.find(item => item.id === input.id) : undefined;
          if (input.id && !previous) throw new TRPCError({ code: "NOT_FOUND", message: "El pago de deuda no pertenece a tu espacio privado." });
          if (input.principalCents > debt.balanceCents + (previous?.principalCents ?? 0)) throw new TRPCError({ code: "BAD_REQUEST", message: "La reducción de principal supera el saldo pendiente de la deuda." });
          if (input.linkedTransactionId) {
            const [expense] = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, input.linkedTransactionId), eq(financialTransactions.userId, ctx.user.id))).limit(1);
            if (!expense || !expense.accountId || expense.type !== "expense" || expense.currency !== input.currency || expense.reviewStatus !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un gasto aprobado, desde una cuenta y de la misma moneda en tu espacio privado." });
            const linkedPayments = await tx.select().from(debtPayments).where(and(eq(debtPayments.userId, ctx.user.id), eq(debtPayments.linkedTransactionId, expense.id)));
            const usedFromExpense = linkedPayments.filter(item => item.id !== input.id).reduce((sum, item) => sum + item.totalPaymentCents, 0);
            if (usedFromExpense + input.totalPaymentCents > expense.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe vinculado supera el gasto real seleccionado." });
            await tx.update(financialTransactions).set({ debtId: debt.id }).where(and(eq(financialTransactions.id, expense.id), eq(financialTransactions.userId, ctx.user.id)));
          }
          const payload = { debtId: debt.id, linkedTransactionId: input.linkedTransactionId ?? null, totalPaymentCents: breakdown.totalPaymentCents, principalCents: breakdown.principalCents, interestCents: breakdown.interestCents, lateInterestCents: breakdown.lateInterestCents, feeCents: breakdown.feeCents, currency: input.currency, paidAt: new Date(input.paidAt), notes: input.notes ?? null };
          if (input.id) await tx.update(debtPayments).set(payload).where(and(eq(debtPayments.id, input.id), eq(debtPayments.userId, ctx.user.id)));
          else await tx.insert(debtPayments).values({ userId: ctx.user.id, ...payload });
          const nextBalance = debt.balanceCents + (previous?.principalCents ?? 0) - input.principalCents;
          await tx.update(debts).set({ balanceCents: nextBalance, status: nextBalance === 0 ? "paid" : "active", nextDueAt: nextBalance === 0 ? null : asDate(input.nextDueAt) }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.user.id)));
        });
        return { success: true };
      }),
      paymentRemove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.transaction(async tx => {
          const [payment] = await tx.select().from(debtPayments).where(and(eq(debtPayments.id, input.id), eq(debtPayments.userId, ctx.user.id))).limit(1);
          if (!payment) return;
          const [debt] = await tx.select().from(debts).where(and(eq(debts.id, payment.debtId), eq(debts.userId, ctx.user.id))).limit(1);
          await tx.delete(debtPayments).where(and(eq(debtPayments.id, payment.id), eq(debtPayments.userId, ctx.user.id)));
          if (!debt) return;
          if (payment.linkedTransactionId) {
            const otherLinks = await tx.select({ id: debtPayments.id }).from(debtPayments).where(and(eq(debtPayments.userId, ctx.user.id), eq(debtPayments.linkedTransactionId, payment.linkedTransactionId))).limit(1);
            if (!otherLinks[0]) await tx.update(financialTransactions).set({ debtId: null }).where(and(eq(financialTransactions.id, payment.linkedTransactionId), eq(financialTransactions.userId, ctx.user.id), eq(financialTransactions.debtId, debt.id)));
          }
          await tx.update(debts).set({ balanceCents: debt.balanceCents + payment.principalCents, status: "active" }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.user.id)));
        });
        return { success: true };
      }),
      amortization: workspaceFinanceProcedure.input(z.object({ debtId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        const db = await requireDb();
        const [debt] = await db.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
        const [payments, adjustments] = await Promise.all([
          db.select().from(debtPayments).where(and(eq(debtPayments.debtId, debt.id), eq(debtPayments.userId, ctx.workspaceAccess.ownerId))),
          db.select().from(debtBalanceAdjustments).where(and(eq(debtBalanceAdjustments.debtId, debt.id), eq(debtBalanceAdjustments.userId, ctx.workspaceAccess.ownerId))),
        ]);
        return { debt, payments: payments.sort((left, right) => left.paidAt.getTime() - right.paidAt.getTime()), adjustments: adjustments.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()), projection: buildManualAmortizationSchedule({ balanceCents: debt.balanceCents, annualRateBps: debt.interestRateBps, paymentCents: debt.installmentCents ?? debt.minimumPaymentCents, maxMonths: debt.installmentCount ?? 120 }) };
      }),
      moratoriumApply: privateFinanceProcedure.input(z.object({ debtId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        return db.transaction(async tx => {
          const [debt] = await tx.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, ctx.user.id))).limit(1);
          if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
          const now = new Date();
          const current = calculateMoratoriumInterest({ balanceCents: debt.balanceCents, annualRateBps: debt.moratoriumRateBps, overdueSinceAt: debt.overdueSinceAt, asOf: now, basisCents: debt.originalAmountCents ?? debt.balanceCents });
          if (!current.isConfigured) throw new TRPCError({ code: "BAD_REQUEST", message: "Configura una tasa moratoria y una fecha de inicio del atraso antes de aplicar el cálculo." });
          const previous = debt.moratoriumLastAppliedAt ? calculateMoratoriumInterest({ balanceCents: debt.balanceCents, annualRateBps: debt.moratoriumRateBps, overdueSinceAt: debt.overdueSinceAt, asOf: debt.moratoriumLastAppliedAt, basisCents: debt.originalAmountCents ?? debt.balanceCents }) : null;
          const amountCents = Math.max(0, current.interestCents - (previous?.interestCents ?? 0));
          if (amountCents === 0) return { applied: false, amountCents: 0, daysLate: current.daysLate, interestCents: current.interestCents, message: "No hay un nuevo periodo de atraso que aplicar." };
          await tx.insert(debtBalanceAdjustments).values({ userId: ctx.user.id, debtId: debt.id, type: "late_interest", amountCents, currency: debt.currency, occurredAt: now, notes: `Cálculo automático revisable · ${current.daysLate} días de atraso · fórmula: saldo base × tasa anual × días / 365.` });
          await tx.update(debts).set({ balanceCents: debt.balanceCents + amountCents, moratoriumLastAppliedAt: now, status: "active" }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.user.id)));
          return { applied: true, amountCents, daysLate: current.daysLate, interestCents: current.interestCents, message: "Interés moratorio aplicado como cargo revisable." };
        });
      }),
      adjustmentSave: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), debtId: z.number().int().positive(), type: z.enum(["late_interest", "finance_charge", "other_charge", "correction"]), amountCents: z.number().int().refine(value => value !== 0, "El importe no puede ser cero."), currency: z.string().length(3), occurredAt: z.number().int().positive(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (input.type !== "correction" && input.amountCents < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Los intereses y cargos se registran como importes positivos; usa corrección para un ajuste negativo confirmado." });
        const db = await requireDb();
        await db.transaction(async tx => {
          const [debt] = await tx.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, ctx.user.id))).limit(1);
          if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda no pertenece a tu espacio privado." });
          if (debt.currency !== input.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El cargo debe usar la misma moneda que la deuda." });
          const [previous] = input.id ? await tx.select().from(debtBalanceAdjustments).where(and(eq(debtBalanceAdjustments.id, input.id), eq(debtBalanceAdjustments.userId, ctx.user.id))).limit(1) : [];
          if (input.id && !previous) throw new TRPCError({ code: "NOT_FOUND", message: "El cargo no pertenece a tu espacio privado." });
          if (previous && previous.debtId !== debt.id) throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes mover un cargo entre deudas." });
          const nextBalance = debt.balanceCents - (previous?.amountCents ?? 0) + input.amountCents;
          if (nextBalance < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "La corrección dejaría el saldo pendiente por debajo de cero." });
          const payload = { debtId: debt.id, type: input.type, amountCents: input.amountCents, currency: input.currency, occurredAt: new Date(input.occurredAt), notes: input.notes ?? null };
          if (input.id) await tx.update(debtBalanceAdjustments).set(payload).where(and(eq(debtBalanceAdjustments.id, input.id), eq(debtBalanceAdjustments.userId, ctx.user.id)));
          else await tx.insert(debtBalanceAdjustments).values({ userId: ctx.user.id, ...payload });
          await tx.update(debts).set({ balanceCents: nextBalance, status: nextBalance === 0 ? "paid" : "active" }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.user.id)));
        });
        return { success: true };
      }),
      adjustmentRemove: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.transaction(async tx => {
          const [adjustment] = await tx.select().from(debtBalanceAdjustments).where(and(eq(debtBalanceAdjustments.id, input.id), eq(debtBalanceAdjustments.userId, ctx.user.id))).limit(1);
          if (!adjustment) return;
          const [debt] = await tx.select().from(debts).where(and(eq(debts.id, adjustment.debtId), eq(debts.userId, ctx.user.id))).limit(1);
          if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "La deuda vinculada ya no existe." });
          const nextBalance = debt.balanceCents - adjustment.amountCents;
          if (nextBalance < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminar este ajuste porque el saldo actual ya incorporó pagos posteriores." });
          await tx.delete(debtBalanceAdjustments).where(and(eq(debtBalanceAdjustments.id, adjustment.id), eq(debtBalanceAdjustments.userId, ctx.user.id)));
          await tx.update(debts).set({ balanceCents: nextBalance, status: nextBalance === 0 ? "paid" : "active" }).where(and(eq(debts.id, debt.id), eq(debts.userId, ctx.user.id)));
        });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [payments, linkedTransactions] = await Promise.all([
          db.select({ id: debtPayments.id }).from(debtPayments).where(and(eq(debtPayments.debtId, input.id), eq(debtPayments.userId, ctx.user.id))).limit(1),
          db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.debtId, input.id), eq(financialTransactions.userId, ctx.user.id))).limit(1),
        ]);
        if (payments[0] || linkedTransactions[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "No elimines una deuda con cuotas o movimientos vinculados. Conserva el historial y márcala como pagada o revisa primero sus enlaces." });
        await db.delete(debts).where(and(eq(debts.id, input.id), eq(debts.userId, ctx.user.id)));
        return { success: true };
      }),
    }),
    goals: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().min(1).max(160), type: z.enum(["emergency", "debt", "housing", "retirement", "investment", "education", "business", "other"]), scope: scopeSchema, targetCents: z.number().int().positive(), currentCents: moneySchema, monthlyContributionCents: moneySchema, currency: z.string().length(3), targetDate: optionalDate, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["active", "paused", "achieved", "cancelled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, targetDate, ...values } = input; const payload = { ...values, targetDate: asDate(targetDate) };
        if (id) await db.update(financialGoals).set(payload).where(and(eq(financialGoals.id, id), eq(financialGoals.userId, ctx.user.id)));
        else await db.insert(financialGoals).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financialGoals, input.id, ctx.user.id)),
    }),
    financialPlans: router({
      save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), projectId: z.number().int().positive(), title: z.string().trim().min(2).max(160), currency: z.string().trim().length(3), status: z.enum(["draft", "active", "completed", "archived"]), startsAt: optionalDate, endsAt: optionalDate, guidingRule: z.string().trim().max(3000).nullable().optional(), notes: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar planes financieros." });
        const db = await requireDb();
        const [project] = await db.select({ id: financialProjects.id }).from(financialProjects).where(and(eq(financialProjects.id, input.projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio." });
        const { id, startsAt, endsAt, status, ...values } = input;
        if (startsAt && endsAt && endsAt < startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha final del plan no puede ser anterior a la inicial." });
        const payload = { ...values, currency: values.currency.toUpperCase(), status, startsAt: asDate(startsAt), endsAt: asDate(endsAt) };
        if (id) {
          const [existing] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, id), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "El plan financiero no pertenece a tu espacio." });
          await db.update(financialPlans).set(payload).where(and(eq(financialPlans.id, id), eq(financialPlans.userId, ctx.workspaceAccess.ownerId)));
          return { success: true, id };
        }
        const result = await db.insert(financialPlans).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true, id: Number(result[0].insertId) };
      }),
      importNotionTemplate: workspaceFinanceProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede importar un plan financiero." });
        const db = await requireDb();
        const [project] = await db.select({ id: financialProjects.id }).from(financialProjects).where(and(eq(financialProjects.id, input.projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio." });
        const [existing] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.projectId, input.projectId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        const planId = await db.transaction(async tx => {
          let financialPlanId: number;
          if (existing) {
            financialPlanId = existing.id;
            await tx.update(financialPlans).set({ title: financialPlanTemplate.title, currency: financialPlanTemplate.currency, status: financialPlanTemplate.status, startsAt: dateAtNoonUtc(financialPlanTemplate.startsAt), endsAt: dateAtNoonUtc(financialPlanTemplate.endsAt), guidingRule: financialPlanTemplate.guidingRule, notes: financialPlanTemplate.notes }).where(and(eq(financialPlans.id, financialPlanId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId)));
          } else {
            const inserted = await tx.insert(financialPlans).values({ userId: ctx.workspaceAccess.ownerId, projectId: input.projectId, title: financialPlanTemplate.title, currency: financialPlanTemplate.currency, status: financialPlanTemplate.status, startsAt: dateAtNoonUtc(financialPlanTemplate.startsAt), endsAt: dateAtNoonUtc(financialPlanTemplate.endsAt), guidingRule: financialPlanTemplate.guidingRule, notes: financialPlanTemplate.notes });
            financialPlanId = Number(inserted[0].insertId);
          }
          const existingLevels = await tx.select({ position: financialPlanLevels.position }).from(financialPlanLevels).where(and(eq(financialPlanLevels.financialPlanId, financialPlanId), eq(financialPlanLevels.userId, ctx.workspaceAccess.ownerId)));
          const levelPositions = new Set(existingLevels.map(level => level.position));
          const missingLevels = financialPlanTemplate.levels.filter(level => !levelPositions.has(level.position));
          if (missingLevels.length) await tx.insert(financialPlanLevels).values(missingLevels.map(level => ({ userId: ctx.workspaceAccess.ownerId, financialPlanId, ...level })));
          const existingScenarios = await tx.select({ title: financialPlanScenarios.title }).from(financialPlanScenarios).where(and(eq(financialPlanScenarios.financialPlanId, financialPlanId), eq(financialPlanScenarios.userId, ctx.workspaceAccess.ownerId)));
          const scenarioTitles = new Set(existingScenarios.map(scenario => scenario.title));
          const missingScenarios = financialPlanTemplate.scenarios.filter(scenario => !scenarioTitles.has(scenario.title));
          if (missingScenarios.length) await tx.insert(financialPlanScenarios).values(missingScenarios.map(scenario => ({ userId: ctx.workspaceAccess.ownerId, financialPlanId, ...scenario })));
          const existingPeriods = await tx.select({ periodStart: financialPlanPeriods.periodStart }).from(financialPlanPeriods).where(and(eq(financialPlanPeriods.financialPlanId, financialPlanId), eq(financialPlanPeriods.userId, ctx.workspaceAccess.ownerId)));
          const periodKeys = new Set(existingPeriods.map(period => period.periodStart.toISOString().slice(0, 7)));
          const missingPeriods = financialPlanTemplate.periods.filter(period => !periodKeys.has(period.periodStart));
          if (missingPeriods.length) await tx.insert(financialPlanPeriods).values(missingPeriods.map(period => ({ userId: ctx.workspaceAccess.ownerId, financialPlanId, periodStart: dateAtNoonUtc(period.periodStart), expectedIncomeCents: period.expectedIncomeCents, plannedCommitmentsCents: period.plannedCommitmentsCents, plannedSavingsCents: period.plannedSavingsCents, status: period.status, notes: period.notes })));
          return financialPlanId;
        });
        return { success: true, id: planId, sourceUrl: financialPlanTemplate.notes.split("\\n")[0].replace("Fuente: ", ""), merged: Boolean(existing) };
      }),
      remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar planes financieros." });
        const db = await requireDb();
        const [existing] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, input.id), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!existing) return { success: true };
        await db.transaction(async tx => {
          await tx.delete(financialPlanLinks).where(and(eq(financialPlanLinks.financialPlanId, input.id), eq(financialPlanLinks.userId, ctx.workspaceAccess.ownerId)));
          await tx.delete(financialPlanPeriods).where(and(eq(financialPlanPeriods.financialPlanId, input.id), eq(financialPlanPeriods.userId, ctx.workspaceAccess.ownerId)));
          await tx.delete(financialPlanScenarios).where(and(eq(financialPlanScenarios.financialPlanId, input.id), eq(financialPlanScenarios.userId, ctx.workspaceAccess.ownerId)));
          await tx.delete(financialPlanLevels).where(and(eq(financialPlanLevels.financialPlanId, input.id), eq(financialPlanLevels.userId, ctx.workspaceAccess.ownerId)));
          await tx.delete(financialPlans).where(and(eq(financialPlans.id, input.id), eq(financialPlans.userId, ctx.workspaceAccess.ownerId)));
        });
        return { success: true };
      }),
      levelSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), financialPlanId: z.number().int().positive(), position: z.number().int().min(0).max(99), title: z.string().trim().min(2).max(160), monthlyTargetCents: moneySchema, activationRule: z.string().trim().max(2000).nullable().optional(), notes: z.string().trim().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar prioridades del plan." });
        const db = await requireDb();
        const [plan] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, input.financialPlanId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "El plan financiero no pertenece a tu espacio." });
        const { id, ...payload } = input;
        if (id) await db.update(financialPlanLevels).set(payload).where(and(eq(financialPlanLevels.id, id), eq(financialPlanLevels.userId, ctx.workspaceAccess.ownerId), eq(financialPlanLevels.financialPlanId, input.financialPlanId)));
        else await db.insert(financialPlanLevels).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      levelRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar prioridades del plan." });
        const db = await requireDb();
        const [link] = await db.select({ id: financialPlanLinks.id }).from(financialPlanLinks).where(and(eq(financialPlanLinks.financialPlanLevelId, input.id), eq(financialPlanLinks.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (link) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta prioridad tiene referencias. Reasígnalas o elimínalas antes." });
        await db.delete(financialPlanLevels).where(and(eq(financialPlanLevels.id, input.id), eq(financialPlanLevels.userId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
      scenarioSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), financialPlanId: z.number().int().positive(), title: z.string().trim().min(2).max(120), incomeFloorCents: moneySchema.nullable().optional(), incomeCeilingCents: moneySchema.nullable().optional(), allocationThroughPosition: z.number().int().min(0).max(99), guidance: z.string().trim().max(3000).nullable().optional(), colorKey: z.enum(["rose", "amber", "sky", "emerald", "slate"]) })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar escenarios del plan." });
        if (input.incomeFloorCents != null && input.incomeCeilingCents != null && input.incomeCeilingCents < input.incomeFloorCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El límite superior no puede ser inferior al ingreso mínimo." });
        const db = await requireDb();
        const [plan] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, input.financialPlanId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "El plan financiero no pertenece a tu espacio." });
        const { id, ...payload } = input;
        if (id) await db.update(financialPlanScenarios).set(payload).where(and(eq(financialPlanScenarios.id, id), eq(financialPlanScenarios.userId, ctx.workspaceAccess.ownerId), eq(financialPlanScenarios.financialPlanId, input.financialPlanId)));
        else await db.insert(financialPlanScenarios).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      scenarioRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar escenarios del plan." });
        const db = await requireDb();
        await db.delete(financialPlanScenarios).where(and(eq(financialPlanScenarios.id, input.id), eq(financialPlanScenarios.userId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
      periodSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), financialPlanId: z.number().int().positive(), periodStart: z.number().int().positive(), expectedIncomeCents: moneySchema, plannedCommitmentsCents: moneySchema, plannedSavingsCents: moneySchema, status: z.enum(["draft", "in_review", "complete"]), notes: z.string().trim().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar meses del plan." });
        const db = await requireDb();
        const [plan] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, input.financialPlanId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "El plan financiero no pertenece a tu espacio." });
        const { id, periodStart, ...values } = input;
        const payload = { ...values, financialPlanId: input.financialPlanId, periodStart: new Date(periodStart) };
        if (id) await db.update(financialPlanPeriods).set(payload).where(and(eq(financialPlanPeriods.id, id), eq(financialPlanPeriods.userId, ctx.workspaceAccess.ownerId), eq(financialPlanPeriods.financialPlanId, input.financialPlanId)));
        else await db.insert(financialPlanPeriods).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      periodRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar meses del plan." });
        const db = await requireDb();
        const [link] = await db.select({ id: financialPlanLinks.id }).from(financialPlanLinks).where(and(eq(financialPlanLinks.financialPlanPeriodId, input.id), eq(financialPlanLinks.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (link) throw new TRPCError({ code: "BAD_REQUEST", message: "Este mes tiene referencias. Reasígnalas o elimínalas antes." });
        await db.delete(financialPlanPeriods).where(and(eq(financialPlanPeriods.id, input.id), eq(financialPlanPeriods.userId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
      linkSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), financialPlanId: z.number().int().positive(), financialPlanLevelId: z.number().int().positive().nullable().optional(), financialPlanPeriodId: z.number().int().positive().nullable().optional(), resourceType: z.enum(["budget", "debt", "credit_card", "payable", "receivable", "goal", "task", "calendar_event", "fiscal_review", "document"]), resourceId: z.number().int().positive(), notes: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede vincular referencias del plan." });
        const db = await requireDb();
        const [plan] = await db.select({ id: financialPlans.id }).from(financialPlans).where(and(eq(financialPlans.id, input.financialPlanId), eq(financialPlans.userId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "El plan financiero no pertenece a tu espacio." });
        if (input.financialPlanLevelId) { const [level] = await db.select({ id: financialPlanLevels.id }).from(financialPlanLevels).where(and(eq(financialPlanLevels.id, input.financialPlanLevelId), eq(financialPlanLevels.financialPlanId, input.financialPlanId), eq(financialPlanLevels.userId, ctx.workspaceAccess.ownerId))).limit(1); if (!level) throw new TRPCError({ code: "BAD_REQUEST", message: "La prioridad seleccionada no pertenece al plan." }); }
        if (input.financialPlanPeriodId) { const [period] = await db.select({ id: financialPlanPeriods.id }).from(financialPlanPeriods).where(and(eq(financialPlanPeriods.id, input.financialPlanPeriodId), eq(financialPlanPeriods.financialPlanId, input.financialPlanId), eq(financialPlanPeriods.userId, ctx.workspaceAccess.ownerId))).limit(1); if (!period) throw new TRPCError({ code: "BAD_REQUEST", message: "El mes seleccionado no pertenece al plan." }); }
        await assertFinancialPlanResourceOwnership(db, ctx.workspaceAccess.ownerId, input.resourceType, input.resourceId);
        const { id, ...payload } = input;
        if (id) await db.update(financialPlanLinks).set(payload).where(and(eq(financialPlanLinks.id, id), eq(financialPlanLinks.userId, ctx.workspaceAccess.ownerId), eq(financialPlanLinks.financialPlanId, input.financialPlanId)));
        else await db.insert(financialPlanLinks).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      linkRemove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar referencias del plan." });
        const db = await requireDb();
        await db.delete(financialPlanLinks).where(and(eq(financialPlanLinks.id, input.id), eq(financialPlanLinks.userId, ctx.workspaceAccess.ownerId)));
        return { success: true };
      }),
    }),
    projectMilestones: router({
      save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), projectId: z.number().int().positive(), title: z.string().trim().min(1).max(180), description: z.string().trim().max(3000).nullable().optional(), status: z.enum(["planned", "in_progress", "completed", "archived"]), startsAt: optionalDate, targetAt: optionalDate })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar hitos de proyecto." });
        const db = await requireDb(); const [project] = await db.select({ id: financialProjects.id }).from(financialProjects).where(and(eq(financialProjects.id, input.projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1);
        if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio." });
        const { id, startsAt, targetAt, status, ...values } = input; const payload = { ...values, status, startsAt: asDate(startsAt), targetAt: asDate(targetAt), archivedAt: status === "archived" ? new Date() : null };
        if (id) await db.update(projectMilestones).set(payload).where(and(eq(projectMilestones.id, id), eq(projectMilestones.userId, ctx.workspaceAccess.ownerId)));
        else await db.insert(projectMilestones).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
        return { success: true };
      }),
      remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar hitos de proyecto." });
        const db = await requireDb(); const [task] = await db.select({ id: financeTasks.id }).from(financeTasks).where(and(eq(financeTasks.userId, ctx.workspaceAccess.ownerId), eq(financeTasks.milestoneId, input.id))).limit(1);
        if (task) throw new TRPCError({ code: "BAD_REQUEST", message: "Este hito tiene tareas vinculadas. Archívalo o desvincula las tareas antes de eliminarlo." });
        await db.delete(projectMilestones).where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.userId, ctx.workspaceAccess.ownerId))); return { success: true };
      }),
    }),
    tasks: router({
      save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), projectId: z.number().int().positive().nullable().optional(), milestoneId: z.number().int().positive().nullable().optional(), linkedTransactionId: z.number().int().positive().nullable().optional(), title: z.string().min(1).max(180), area: z.enum(["budget", "debt", "savings", "investment", "tax", "documents", "business", "review", "other"]), scope: scopeSchema, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["pending", "in_progress", "waiting", "completed", "cancelled"]), dueAt: optionalDate, goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(), requiresConfirmation: z.boolean(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar tareas." });
        const db = await requireDb(); const { id, dueAt, milestoneId, projectId, linkedTransactionId, ...values } = input;
        if (projectId) { const [project] = await db.select({ id: financialProjects.id }).from(financialProjects).where(and(eq(financialProjects.id, projectId), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId))).limit(1); if (!project) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto seleccionado no pertenece a tu espacio." }); }
        if (milestoneId) { const [milestone] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.userId, ctx.workspaceAccess.ownerId))).limit(1); if (!milestone || (projectId && milestone.projectId !== projectId)) throw new TRPCError({ code: "BAD_REQUEST", message: "El hito no pertenece al proyecto seleccionado." }); }
        if (linkedTransactionId) { const [transaction] = await db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.id, linkedTransactionId), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1); if (!transaction) throw new TRPCError({ code: "BAD_REQUEST", message: "El movimiento seleccionado no pertenece a tu espacio privado." }); }
        const payload = { ...values, projectId: projectId ?? null, milestoneId: milestoneId ?? null, linkedTransactionId: linkedTransactionId ?? null, dueAt: asDate(dueAt), archivedAt: null };
        if (id) await db.update(financeTasks).set(payload).where(and(eq(financeTasks.id, id), eq(financeTasks.userId, ctx.workspaceAccess.ownerId)));
        else await db.insert(financeTasks).values({ userId: ctx.workspaceAccess.ownerId, ...payload }); return { success: true };
      }),
      archive: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede archivar tareas." }); const db = await requireDb(); await db.update(financeTasks).set({ archivedAt: input.archived ? new Date() : null }).where(and(eq(financeTasks.id, input.id), eq(financeTasks.userId, ctx.workspaceAccess.ownerId))); return { success: true }; }),
      remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar tareas." }); const db = await requireDb(); await db.transaction(async tx => { await tx.update(calendarEvents).set({ linkedTaskId: null }).where(and(eq(calendarEvents.userId, ctx.workspaceAccess.ownerId), eq(calendarEvents.linkedTaskId, input.id))); await tx.delete(financeTasks).where(and(eq(financeTasks.id, input.id), eq(financeTasks.userId, ctx.workspaceAccess.ownerId))); }); return { success: true }; }),
    }),
    reviews: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), periodStart: z.number().int().positive(), status: z.enum(["draft", "reviewed", "closed"]), incomeCents: moneySchema, expenseCents: moneySchema, netCashFlowCents: z.number().int(), observations: z.string().max(5000).nullable().optional(), nextActions: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, periodStart, ...values } = input; const payload = { ...values, periodStart: new Date(periodStart) };
        if (id) await db.update(monthlyReviews).set(payload).where(and(eq(monthlyReviews.id, id), eq(monthlyReviews.userId, ctx.user.id)));
        else await db.insert(monthlyReviews).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
    }),
    monthlyControl: router({
      save: privateFinanceProcedure.input(z.object({
        periodStart: z.number().int().positive(),
        status: z.enum(["draft", "reviewed", "closed"]),
        observations: z.string().max(5000).nullable().optional(),
        nextActions: z.string().max(5000).nullable().optional(),
        checks: z.object({
          transactionsConfirmed: z.boolean(),
          qualityConfirmed: z.boolean(),
          calendarConfirmed: z.boolean(),
          obligationsConfirmed: z.boolean(),
          fiscalConfirmed: z.boolean(),
          patrimonyConfirmed: z.boolean(),
        }),
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const access = await resolveWorkspaceAccess(ctx.user.id);
        if (access.role !== "owner" && !access.canReview) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para cerrar la revisión mensual." });
        const ownerId = access.ownerId;
        const { start } = monthBounds(new Date(input.periodStart));
        const snapshot = await getFinanceSnapshot(ctx.user.id, start);
        const existing = await db.select({ id: monthlyReviews.id }).from(monthlyReviews).where(and(eq(monthlyReviews.userId, ownerId), eq(monthlyReviews.periodStart, start))).orderBy(desc(monthlyReviews.updatedAt)).limit(1);
        const reviewPayload = {
          periodStart: start,
          status: input.status,
          incomeCents: snapshot.dashboard.cashFlow.incomeCents,
          expenseCents: snapshot.dashboard.cashFlow.expenseCents,
          netCashFlowCents: snapshot.dashboard.cashFlow.netCashFlowCents,
          observations: input.observations ?? null,
          nextActions: input.nextActions ?? null,
        };
        let monthlyReviewId = existing[0]?.id;
        if (monthlyReviewId) await db.update(monthlyReviews).set(reviewPayload).where(and(eq(monthlyReviews.id, monthlyReviewId), eq(monthlyReviews.userId, ownerId)));
        else {
          await db.insert(monthlyReviews).values({ userId: ownerId, ...reviewPayload });
          const inserted = await db.select({ id: monthlyReviews.id }).from(monthlyReviews).where(and(eq(monthlyReviews.userId, ownerId), eq(monthlyReviews.periodStart, start))).orderBy(desc(monthlyReviews.id)).limit(1);
          monthlyReviewId = inserted[0]?.id;
        }
        if (!monthlyReviewId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar la revisión mensual." });
        const controlPayload = { userId: ownerId, monthlyReviewId, ...input.checks };
        const currentControl = await db.select({ id: monthlyReviewControls.id }).from(monthlyReviewControls).where(and(eq(monthlyReviewControls.userId, ownerId), eq(monthlyReviewControls.monthlyReviewId, monthlyReviewId))).limit(1);
        if (currentControl[0]) await db.update(monthlyReviewControls).set(input.checks).where(and(eq(monthlyReviewControls.id, currentControl[0].id), eq(monthlyReviewControls.userId, ownerId)));
        else await db.insert(monthlyReviewControls).values(controlPayload);
        return { success: true, monthlyReviewId };
      }),
    }),
    surplusPolicy: router({
      save: privateFinanceProcedure.input(z.object({
        reserveBps: z.number().int().min(0).max(10000),
        debtBps: z.number().int().min(0).max(10000),
        savingsBps: z.number().int().min(0).max(10000),
        investmentBps: z.number().int().min(0).max(10000),
        notes: z.string().max(2000).nullable().optional(),
      }).superRefine((value, context) => {
        if (value.reserveBps + value.debtBps + value.savingsBps + value.investmentBps !== 10000) context.addIssue({ code: "custom", message: "Los porcentajes deben sumar 100%." });
      })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const access = await resolveWorkspaceAccess(ctx.user.id);
        if (access.role !== "owner" && !access.canReview) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para guardar la política de excedentes." });
        const payload = { reserveBps: input.reserveBps, debtBps: input.debtBps, savingsBps: input.savingsBps, investmentBps: input.investmentBps, notes: input.notes ?? null };
        const existing = await db.select({ id: surplusAllocationPolicies.id }).from(surplusAllocationPolicies).where(eq(surplusAllocationPolicies.userId, access.ownerId)).limit(1);
        if (existing[0]) await db.update(surplusAllocationPolicies).set(payload).where(eq(surplusAllocationPolicies.id, existing[0].id));
        else await db.insert(surplusAllocationPolicies).values({ userId: access.ownerId, ...payload });
        return { success: true };
      }),
    }),
    statements: router({
      listAll: privateFinanceProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select().from(monthlyFinancialStatements).where(eq(monthlyFinancialStatements.userId, ctx.user.id)).orderBy(desc(monthlyFinancialStatements.periodStart)); }),
      preview: privateFinanceProcedure.input(z.object({ periodStart: z.number().int().positive(), scope: scopeSchema, entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), currency: z.string().length(3).nullable().optional(), reviewStatus: z.enum(["draft", "pending_review", "approved"]).nullable().optional() })).query(async ({ ctx, input }) => {
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        const { start, end } = monthBounds(new Date(input.periodStart));
        const reportCurrency = snapshot.dashboard.reportCurrency;
        const transactions = snapshot.transactions.filter(item => (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency || item.reportCurrency === input.currency) && (!input.reviewStatus || item.reviewStatus === input.reviewStatus));
        const accounts = snapshot.accounts.filter(item => item.currency === reportCurrency && (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency));
        const debts = [...snapshot.debts, ...(snapshot.creditCards ?? []).filter(card => card.status !== "closed").map(card => ({ ...card, status: "active" as const, nextDueAt: null }))].filter(item => item.currency === reportCurrency && (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency));
        const investmentAssets = snapshot.investments.map(item => ({ item, valueCents: comparableInvestmentValueCents(item, reportCurrency) })).filter((item): item is { item: typeof snapshot.investments[number]; valueCents: number } => item.valueCents !== null).filter(({ item }) => (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency || item.reportCurrency === input.currency)).map(({ item, valueCents }) => ({ currentValueCents: valueCents, status: "active" as const, isLiquid: false, scope: item.scope }));
        return calculateMonthlyStatement(transactions, [...accounts, ...investmentAssets], debts, start, end, input.scope, reportCurrency);
      }),
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), periodStart: z.number().int().positive(), scope: scopeSchema, entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), currency: z.string().length(3).nullable().optional(), reviewStatus: z.enum(["draft", "pending_review", "approved"]).nullable().optional(), status: z.enum(["draft", "closed"]), notes: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        const { start, end } = monthBounds(new Date(input.periodStart));
        const reportCurrency = snapshot.dashboard.reportCurrency;
        const transactions = snapshot.transactions.filter(item => (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency || item.reportCurrency === input.currency) && (!input.reviewStatus || item.reviewStatus === input.reviewStatus));
        const accounts = snapshot.accounts.filter(item => item.currency === reportCurrency && (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency));
        const debts = [...snapshot.debts, ...(snapshot.creditCards ?? []).filter(card => card.status !== "closed").map(card => ({ ...card, status: "active" as const, nextDueAt: null }))].filter(item => item.currency === reportCurrency && (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency));
        const investmentAssets = snapshot.investments.map(item => ({ item, valueCents: comparableInvestmentValueCents(item, reportCurrency) })).filter((item): item is { item: typeof snapshot.investments[number]; valueCents: number } => item.valueCents !== null).filter(({ item }) => (!input.entityId || item.entityId === input.entityId) && (!input.projectId || item.projectId === input.projectId) && (!input.currency || item.currency === input.currency || item.reportCurrency === input.currency)).map(({ item, valueCents }) => ({ currentValueCents: valueCents, status: "active" as const, isLiquid: false, scope: item.scope }));
        const calculated = calculateMonthlyStatement(transactions, [...accounts, ...investmentAssets], debts, start, end, input.scope, reportCurrency);
        const payload = { incomeCents: calculated.incomeCents, expenseCents: calculated.expenseCents, netCashFlowCents: calculated.netCashFlowCents, assetCents: calculated.assetCents, liabilityCents: calculated.liabilityCents, netWorthCents: calculated.netWorthCents, liquidCents: calculated.liquidCents, entityId: input.entityId ?? null, projectId: input.projectId ?? null, filterCurrency: input.currency ?? null, filterReviewStatus: input.reviewStatus ?? null, periodStart: start, scope: input.scope, status: input.status, notes: input.notes ?? null };
        if (input.id) {
          await db.update(monthlyFinancialStatements).set(payload).where(and(eq(monthlyFinancialStatements.id, input.id), eq(monthlyFinancialStatements.userId, ctx.user.id)));
        } else {
          const existing = await db.select({ id: monthlyFinancialStatements.id }).from(monthlyFinancialStatements).where(and(eq(monthlyFinancialStatements.userId, ctx.user.id), eq(monthlyFinancialStatements.scope, input.scope), eq(monthlyFinancialStatements.periodStart, start), input.entityId ? eq(monthlyFinancialStatements.entityId, input.entityId) : isNull(monthlyFinancialStatements.entityId), input.projectId ? eq(monthlyFinancialStatements.projectId, input.projectId) : isNull(monthlyFinancialStatements.projectId), input.currency ? eq(monthlyFinancialStatements.filterCurrency, input.currency) : isNull(monthlyFinancialStatements.filterCurrency), input.reviewStatus ? eq(monthlyFinancialStatements.filterReviewStatus, input.reviewStatus) : isNull(monthlyFinancialStatements.filterReviewStatus), isNull(monthlyFinancialStatements.archivedAt))).limit(1);
          if (existing[0]) await db.update(monthlyFinancialStatements).set(payload).where(eq(monthlyFinancialStatements.id, existing[0].id));
          else await db.insert(monthlyFinancialStatements).values({ userId: ctx.user.id, ...payload });
        }
        return { success: true, statement: calculated };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(monthlyFinancialStatements, input.id, ctx.user.id)),
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); await db.update(monthlyFinancialStatements).set({ archivedAt: new Date() }).where(and(eq(monthlyFinancialStatements.id, input.id), eq(monthlyFinancialStatements.userId, ctx.user.id))); return { success: true }; }),
      restore: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); await db.update(monthlyFinancialStatements).set({ archivedAt: null }).where(and(eq(monthlyFinancialStatements.id, input.id), eq(monthlyFinancialStatements.userId, ctx.user.id))); return { success: true }; }),
    }),
    travels: router({
      list: privateFinanceProcedure.query(async ({ ctx }) => {
        const db = await requireDb();
        const plans = await db.select().from(travelPlans).where(eq(travelPlans.userId, ctx.user.id)).orderBy(desc(travelPlans.startsAt));
        const planIds = plans.map(plan => plan.id);
        const items = planIds.length ? await db.select().from(travelItems).where(and(eq(travelItems.userId, ctx.user.id), inArray(travelItems.travelPlanId, planIds))).orderBy(desc(travelItems.startsAt)) : [];
        const categories = await db.select().from(travelCategories).where(and(eq(travelCategories.userId, ctx.user.id), eq(travelCategories.isActive, true))).orderBy(asc(travelCategories.name));
        return { plans, items, categories };
      }),
      categorySave: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(100), colorKey: z.enum(["teal", "emerald", "sky", "indigo", "violet", "amber", "orange", "rose", "slate"]) })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        if (input.id) await db.update(travelCategories).set({ name: input.name, colorKey: input.colorKey, isActive: true }).where(and(eq(travelCategories.id, input.id), eq(travelCategories.userId, ctx.user.id)));
        else await db.insert(travelCategories).values({ userId: ctx.user.id, name: input.name, colorKey: input.colorKey });
        return { success: true };
      }),
      categoryRemove: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db.update(travelCategories).set({ isActive: false }).where(and(eq(travelCategories.id, input.id), eq(travelCategories.userId, ctx.user.id)));
        return { success: true };
      }),
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(180), origin: z.string().trim().max(140).nullable().optional(), destination: z.string().trim().max(140).nullable().optional(), purpose: z.string().trim().max(240).nullable().optional(), scope: scopeSchema, status: z.enum(["planned", "in_progress", "completed", "cancelled", "archived"]), startsAt: z.string().min(1), endsAt: z.string().nullable().optional(), budgetCents: z.number().int().min(0), currency: z.string().length(3), timeZone: timeZoneSchema.default("America/Mexico_City"), projectId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), notes: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const payload = { name: input.name, origin: input.origin ?? null, destination: input.destination ?? null, purpose: input.purpose ?? null, scope: input.scope, status: input.status, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, budgetCents: input.budgetCents, currency: input.currency.toUpperCase(), timeZone: input.timeZone, projectId: input.projectId ?? null, entityId: input.entityId ?? null, goalId: input.goalId ?? null, contactId: input.contactId ?? null, notes: input.notes ?? null };
        if (input.id) await db.update(travelPlans).set(payload).where(and(eq(travelPlans.id, input.id), eq(travelPlans.userId, ctx.user.id)));
        else await db.insert(travelPlans).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      itemSave: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), travelPlanId: z.number().int().positive(), itemType: z.enum(["flight", "train", "car_rental", "ride", "hotel", "airbnb", "exhibition", "meal", "other"]), title: z.string().trim().min(1).max(180), provider: z.string().trim().max(180).nullable().optional(), location: z.string().trim().max(180).nullable().optional(), startsAt: z.string().nullable().optional(), endsAt: z.string().nullable().optional(), amountCents: z.number().int().min(0), currency: z.string().length(3), status: z.enum(["planned", "booked", "paid", "completed", "cancelled"]), transactionId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), taskId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), documentId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), notes: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const plan = await db.select({ id: travelPlans.id }).from(travelPlans).where(and(eq(travelPlans.id, input.travelPlanId), eq(travelPlans.userId, ctx.user.id))).limit(1);
        if (!plan[0]) throw new TRPCError({ code: "NOT_FOUND", message: "El viaje no existe en tu espacio privado." });
        if (input.categoryId) {
          const category = await db.select({ id: travelCategories.id }).from(travelCategories).where(and(eq(travelCategories.id, input.categoryId), eq(travelCategories.userId, ctx.user.id), eq(travelCategories.isActive, true))).limit(1);
          if (!category[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "La categoría no pertenece a tu espacio privado." });
        }
        const payload = { travelPlanId: input.travelPlanId, itemType: input.itemType, title: input.title, provider: input.provider ?? null, location: input.location ?? null, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, amountCents: input.amountCents, currency: input.currency.toUpperCase(), status: input.status, transactionId: input.transactionId ?? null, projectId: input.projectId ?? null, taskId: input.taskId ?? null, goalId: input.goalId ?? null, entityId: input.entityId ?? null, contactId: input.contactId ?? null, documentId: input.documentId ?? null, categoryId: input.categoryId ?? null, notes: input.notes ?? null };
        if (input.id) await db.update(travelItems).set(payload).where(and(eq(travelItems.id, input.id), eq(travelItems.userId, ctx.user.id), eq(travelItems.travelPlanId, input.travelPlanId)));
        else await db.insert(travelItems).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const linked = await db.select({ id: travelItems.id }).from(travelItems).where(and(eq(travelItems.travelPlanId, input.id), eq(travelItems.userId, ctx.user.id))).limit(1);
        if (linked[0]) throw new TRPCError({ code: "CONFLICT", message: "Archiva el viaje si conserva itinerarios; no se elimina para proteger su trazabilidad." });
        await db.delete(travelPlans).where(and(eq(travelPlans.id, input.id), eq(travelPlans.userId, ctx.user.id)));
        return { success: true };
      }),
      itemRemove: privateFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); await db.delete(travelItems).where(and(eq(travelItems.id, input.id), eq(travelItems.userId, ctx.user.id))); return { success: true }; }),
    }),
    decisions: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), title: z.string().min(1).max(180), area: z.enum(["budget", "debt", "savings", "investment", "tax", "insurance", "assets", "other"]), status: z.enum(["proposal", "approved", "reviewed", "discarded"]), dataUsed: z.string().max(5000).nullable().optional(), assumptions: z.string().max(5000).nullable().optional(), risks: z.string().max(5000).nullable().optional(), alternatives: z.string().max(5000).nullable().optional(), approvedAction: z.string().max(5000).nullable().optional(), reviewAt: optionalDate })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, reviewAt, ...values } = input; const payload = { ...values, reviewAt: asDate(reviewAt) };
        if (id) await db.update(decisionRecords).set(payload).where(and(eq(decisionRecords.id, id), eq(decisionRecords.userId, ctx.user.id)));
        else await db.insert(decisionRecords).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(decisionRecords, input.id, ctx.user.id)),
    }),
    assistant: router({
      chat: privateFinanceProcedure.input(z.object({ message: z.string().min(1).max(1600) })).mutation(async ({ ctx, input }) => {
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        try {
          const content = await askClaudeForMexi({
            system: `Eres Mexi, el asistente privado y explicable de Meximoney. ${manualOnlyNotice} Usa exclusivamente el JSON de registros manuales suministrado en este mensaje y la pregunta de la usuaria. No uses búsqueda web, conocimientos externos, precios de mercado, normas fiscales actuales ni herramientas. No inventes datos. Si falta información, dilo de forma explícita y propone qué registro manual se debe crear o actualizar. No des instrucciones para transferir, pagar, comprar, vender, contratar ni cancelar productos financieros. Ofrece análisis educativo, explica cálculos y distingue entre datos, supuestos, riesgos y próximos pasos. Responde siempre en español y usa importes en centavos solo si explicas el formato. Cierra con la frase: "Sin conexiones bancarias ni acciones financieras ejecutadas."`,
            prompt: `REGISTROS MANUALES DE MEXIMONEY:\n${createManualSnapshotText(snapshot)}\n\nPREGUNTA DE LA USUARIA:\n${input.message}`,
          });
          return { content, notice: manualOnlyNotice };
        } catch (error) {
          console.error("[Mexi] Claude unavailable:", error instanceof Error ? error.message : "Error no identificable");
          return { content: "Mexi no pudo obtener una respuesta de Claude en este momento. Tus datos no se han modificado. Puedes reintentar la consulta; si el problema continúa, revisa que la clave privada de Claude siga activa.", notice: manualOnlyNotice };
        }
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
