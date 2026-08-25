import { COOKIE_NAME } from "@shared/const";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
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
  debts,
  debtPayments,
  decisionRecords,
  exchangeRates,
  financeDocuments,
  financeNotifications,
  financeTasks,
  financialContacts,
  financialGoals,
  financialProfiles,
  financialProjects,
  financialTransactions,
  investments,
  investmentOperations,
  monthlyReviews,
  monthlyFinancialStatements,
  notificationPreferences,
  localCredentials,
  passwordResetTokens,
  payablePayments,
  payables,
  privacyConsents,
  qualityIssueAcknowledgements,
  receivables,
  receivablePayments,
  recurringTemplates,
  users,
  workspaceEntities,
} from "../drizzle/schema";
import { createPasswordResetToken, hashPassword, hashPasswordResetToken, verifyPassword } from "./credentials";
import { sendPasswordResetEmail } from "./passwordResetEmail";
import { deleteAllFinancialData, deleteOwnedRow, getFinanceSnapshot, getProfile, requireDb, resolveWorkspaceAccess } from "./db";
import { storagePut } from "./storage";
import { requiresPersonalProfileConsent } from "./profilePrivacy";
import { calculateMonthlyStatement, monthBounds } from "./finance";
import { comparableInvestmentValueCents } from "./investmentData";
import { applyInvestmentDelta, investmentOperationDelta, totalsFromInvestmentOperations } from "./investmentOperations";
import { findPossibleDuplicates } from "./imports";
import { creditCardAlertCandidates } from "./creditCardAlerts";
import { extractQuickCaptureDraft } from "./quickCapture";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const scopeSchema = z.enum(["personal", "business", "mixed"]);
const creditCardScopeSchema = z.enum(["personal", "pfae", "business", "mixed"]);
const moneySchema = z.number().int().min(0);
const optionalDate = z.number().int().positive().nullable().optional();
const calendarColorCategorySchema = z.enum(["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other", "debt_due", "document_due", "task_due", "fiscal_reserve"]);
const calendarColorKeySchema = z.enum(["teal", "emerald", "sky", "indigo", "violet", "amber", "orange", "rose", "slate"]);
const importRowSchema = z.object({ accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), type: z.enum(["income", "expense"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), reportCurrency: z.string().length(3).nullable().optional(), reportAmountCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), occurredAt: z.number().int().positive(), isEssential: z.boolean().default(false), status: z.enum(["confirmed", "estimated", "needs_review"]).default("confirmed"), notes: z.string().max(3000).nullable().optional(), allowPossibleDuplicate: z.boolean().default(false) });
const manualOnlyNotice = "Meximoney trabaja solo con tus registros manuales. No tiene acceso a bancos ni puede ejecutar acciones financieras.";
const credentialInput = z.object({
  email: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres.").max(128),
});

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
      const genericResponse = { success: true, deliveryReady, message: deliveryReady ? "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña." : "La recuperación por correo está preparada y se activará cuando se verifique el remitente de Meximoney." };
      if (!deliveryReady) return genericResponse;
      if (!record[0]) return genericResponse;
      const rawToken = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record[0].userId));
      await db.insert(passwordResetTokens).values({ userId: record[0].userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
      const host = ctx.req.get("host");
      const baseUrl = host === "mexifinance-stkndi6z.manus.space" ? `https://${host}` : "https://mexifinance-stkndi6z.manus.space";
      try { await sendPasswordResetEmail({ to: record[0].email, resetUrl: `${baseUrl}/restablecer-contrasena?token=${encodeURIComponent(rawToken)}` }); } catch (error) { await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)); console.error("[Password reset] Email delivery failed", error); }
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
      });
      return { success: true };
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
    dashboard: protectedProcedure.query(({ ctx }) => getFinanceSnapshot(ctx.user.id)),
    workspace: router({
      get: protectedProcedure.query(({ ctx }) => getFinanceSnapshot(ctx.user.id)),
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
      projectSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive(), name: z.string().trim().min(2).max(160), status: z.enum(["active", "paused", "closed", "planned"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar proyectos." });
        const db = await requireDb(); const { id, ...values } = input;
        if (id) await db.update(financialProjects).set(values).where(and(eq(financialProjects.id, id), eq(financialProjects.ownerId, ctx.workspaceAccess.ownerId)));
        else await db.insert(financialProjects).values({ ownerId: ctx.workspaceAccess.ownerId, ...values });
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
      transactionSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(), creditCardId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), type: z.enum(["income", "expense", "transfer_out", "transfer_in"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), reportCurrency: z.string().length(3).nullable().optional(), reportAmountCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), occurredAt: z.number().int().positive(), isEssential: z.boolean(), transferGroupId: z.string().max(64).nullable().optional(), status: z.enum(["confirmed", "estimated", "needs_review"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (ctx.workspaceAccess.role !== "owner" && !ctx.workspaceAccess.canCreateDrafts) throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no permite crear borradores." });
        if (input.type === "transfer_out" || input.type === "transfer_in") throw new TRPCError({ code: "BAD_REQUEST", message: "Usa el formulario de traspaso entre cuentas para crear ambas partes de forma coherente." });
        const db = await requireDb(); const { id, occurredAt, exchangeRateDate, ...values } = input;
        if (values.contactId) {
          const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
        }
        if (values.creditCardId && values.type !== "expense") throw new TRPCError({ code: "BAD_REQUEST", message: "Una tarjeta de crédito sólo puede vincularse a un gasto." });
        if (values.debtId) {
          const [debt] = await db.select().from(debts).where(and(eq(debts.id, values.debtId), eq(debts.userId, ctx.workspaceAccess.ownerId))).limit(1);
          if (!debt || debt.currency !== values.currency || (debt.status !== "active" && debt.status !== "review")) throw new TRPCError({ code: "BAD_REQUEST", message: "La deuda debe estar activa, pertenecer a tu espacio y usar la misma moneda." });
          if (values.type !== "expense") throw new TRPCError({ code: "BAD_REQUEST", message: "Una deuda sólo puede vincularse a un gasto real." });
        }
        const isOwner = ctx.workspaceAccess.role === "owner";
        const payload = { ...values, occurredAt: new Date(occurredAt), exchangeRateDate: asDate(exchangeRateDate), reviewStatus: isOwner ? "approved" as const : "pending_review" as const, status: isOwner ? values.status : "needs_review" as const, createdByUserId: ctx.user.id, reviewedByUserId: isOwner ? ctx.user.id : null, reviewedAt: isOwner ? new Date() : null };
        await db.transaction(async tx => {
          const previous = id ? (await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId))).limit(1))[0] : null;
          const cardIds = Array.from(new Set([previous?.creditCardId, payload.creditCardId].filter((cardId): cardId is number => Boolean(cardId))));
          const cards = cardIds.length ? await tx.select().from(creditCards).where(and(eq(creditCards.userId, ctx.workspaceAccess.ownerId), inArray(creditCards.id, cardIds))) : [];
          if (payload.creditCardId) {
            const card = cards.find(item => item.id === payload.creditCardId);
            if (!card || card.currency !== payload.currency || card.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "La tarjeta debe estar activa, pertenecer a tu espacio y usar la misma moneda." });
          }
          if (id) await tx.update(financialTransactions).set(payload).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, ctx.workspaceAccess.ownerId)));
          else await tx.insert(financialTransactions).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          for (const card of cards) {
            const priorEffect = previous?.creditCardId === card.id && previous.type === "expense" ? previous.amountCents : 0;
            const nextEffect = payload.creditCardId === card.id && payload.type === "expense" ? payload.amountCents : 0;
            const nextBalance = Math.max(0, card.balanceCents - priorEffect + nextEffect);
            await tx.update(creditCards).set({ balanceCents: nextBalance }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          }
        });
        return { success: true };
      }),
      creditCards: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(140), issuer: z.string().trim().max(140).nullable().optional(), scope: creditCardScopeSchema, currency: z.string().length(3), creditLimitCents: moneySchema, balanceCents: moneySchema, interestRateBps: z.number().int().min(0).nullable().optional(), minimumPaymentCents: moneySchema, statementClosingDay: z.number().int().min(1).max(31).nullable().optional(), paymentDueDay: z.number().int().min(1).max(31).nullable().optional(), status: z.enum(["active", "paused", "closed"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar tarjetas de crédito." });
          const db = await requireDb(); const { id, ...values } = input;
          if (id) await db.update(creditCards).set(values).where(and(eq(creditCards.id, id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(creditCards).values({ userId: ctx.workspaceAccess.ownerId, ...values });
          return { success: true };
        }),
        paymentSave: workspaceFinanceProcedure.input(z.object({ creditCardId: z.number().int().positive(), sourceAccountId: z.number().int().positive(), amountCents: z.number().int().positive(), occurredAt: z.number().int().positive(), status: z.enum(["confirmed", "estimated", "needs_review"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede registrar pagos de tarjeta." });
          const db = await requireDb();
          const [[card], [source]] = await Promise.all([
            db.select().from(creditCards).where(and(eq(creditCards.id, input.creditCardId), eq(creditCards.userId, ctx.workspaceAccess.ownerId))).limit(1),
            db.select().from(accounts).where(and(eq(accounts.id, input.sourceAccountId), eq(accounts.userId, ctx.workspaceAccess.ownerId))).limit(1),
          ]);
          if (!card || !source || card.status !== "active" || source.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "La tarjeta y la cuenta de origen deben estar activas y pertenecer a tu espacio." });
          if (card.currency !== source.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago de tarjeta requiere la misma moneda en cuenta y tarjeta." });
          if (input.amountCents > card.balanceCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago no puede superar el saldo pendiente de la tarjeta." });
          const groupId = randomUUID(); const occurredAt = new Date(input.occurredAt); const suffix = input.notes?.trim() ? ` · ${input.notes.trim()}` : "";
          await db.transaction(async tx => {
            await tx.insert(financialTransactions).values([
              { userId: ctx.workspaceAccess.ownerId, entityId: source.entityId, projectId: source.projectId, accountId: source.id, type: "transfer_out", scope: source.scope, amountCents: input.amountCents, currency: source.currency, reportCurrency: source.currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: `Pago a ${card.name}${suffix}` },
              { userId: ctx.workspaceAccess.ownerId, entityId: card.entityId, projectId: card.projectId, creditCardId: card.id, type: "transfer_in", scope: card.scope === "pfae" ? "business" : card.scope, amountCents: input.amountCents, currency: card.currency, reportCurrency: card.currency, reportAmountCents: input.amountCents, incomeNature: "other", occurredAt, isEssential: false, transferGroupId: groupId, status: input.status, reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: `Pago desde ${source.name}${suffix}` },
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
          if (cardPayment?.creditCardId) {
            const [card] = await tx.select().from(creditCards).where(and(eq(creditCards.id, cardPayment.creditCardId), eq(creditCards.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (card) await tx.update(creditCards).set({ balanceCents: card.balanceCents + cardPayment.amountCents }).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, ctx.workspaceAccess.ownerId)));
          }
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
      investments: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(180), type: z.enum(["savings", "fixed_income", "fund_etf", "stock", "crypto", "land", "property", "business_equity", "retirement", "other"]), institution: z.string().trim().max(180).nullable().optional(), scope: scopeSchema, currency: z.string().length(3), costBasisCents: moneySchema, currentValueCents: moneySchema, reportCurrency: z.string().length(3).nullable().optional(), reportValueCents: moneySchema.nullable().optional(), exchangeRateMicros: z.number().int().positive().nullable().optional(), exchangeRateDate: optionalDate, valuationDate: optionalDate, includeInNetWorth: z.boolean(), status: z.enum(["active", "paused", "closed"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar ahorro e inversiones." });
          const db = await requireDb(); const { id, exchangeRateDate, valuationDate, ...values } = input;
          const payload = { ...values, exchangeRateDate: asDate(exchangeRateDate), valuationDate: asDate(valuationDate) };
          if (id) await db.update(investments).set(payload).where(and(eq(investments.id, id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          else await db.insert(investments).values({ userId: ctx.workspaceAccess.ownerId, ...payload });
          return { success: true };
        }),
        remove: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede eliminar posiciones." });
          const db = await requireDb();
          await db.transaction(async tx => {
            await tx.delete(investmentOperations).where(and(eq(investmentOperations.investmentId, input.id), eq(investmentOperations.userId, ctx.workspaceAccess.ownerId)));
            await tx.delete(investments).where(and(eq(investments.id, input.id), eq(investments.userId, ctx.workspaceAccess.ownerId)));
          });
          return { success: true };
        }),
        operationSave: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), investmentId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), type: z.enum(["contribution", "withdrawal", "yield", "valuation_adjustment"]), amountCents: z.number().int().positive(), currency: z.string().length(3), occurredAt: z.number().int().positive(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
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
      recurringTemplates: router({
        save: workspaceFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(180), counterparty: z.string().trim().max(180).nullable().optional(), type: z.enum(["income", "expense"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), incomeNature: z.enum(["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]), cadence: z.enum(["weekly", "monthly", "quarterly", "annual"]), nextOccurrenceAt: optionalDate, status: z.enum(["active", "paused"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
          if (ctx.workspaceAccess.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Solo la propietaria puede administrar plantillas recurrentes." });
          const db = await requireDb(); const { id, nextOccurrenceAt, ...values } = input;
          if (values.contactId) {
            const contact = await db.select({ id: financialContacts.id }).from(financialContacts).where(and(eq(financialContacts.id, values.contactId), eq(financialContacts.userId, ctx.workspaceAccess.ownerId))).limit(1);
            if (!contact[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "El contacto seleccionado no pertenece a tu espacio privado." });
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
          await db.insert(financialTransactions).values({ userId: ctx.workspaceAccess.ownerId, accountId: template.accountId, categoryId: template.categoryId, goalId: null, debtId: null, contactId: template.contactId, entityId: template.entityId, projectId: template.projectId, type: template.type, scope: template.scope, amountCents: template.amountCents, currency: template.currency, reportCurrency: template.currency, reportAmountCents: template.amountCents, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: template.incomeNature, occurredAt: new Date(input.occurredAt), isEssential: false, transferGroupId: null, status: "confirmed", reviewStatus: "approved", createdByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), notes: [template.name, template.counterparty].filter(Boolean).join(" · ") || template.notes });
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
        const preferences = storedPreferences ?? { inAppEnabled: true, calendarEnabled: true, documentsEnabled: true, debtsEnabled: true, reviewsEnabled: true, budgetEnabled: true, taxReserveEnabled: true, telegramEnabled: false, telegramScheduleCronTaskUid: null, telegramLastDigestDate: null };
        if (!preferences.inAppEnabled) return { preferences, notifications: [] };
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        const now = new Date(); const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const candidates: Array<{ type: string; title: string; message: string; relatedEntityType: string; relatedEntityId: number }> = [];
        if (preferences.inAppEnabled && preferences.calendarEnabled) snapshot.calendarEvents.filter(event => event.status === "planned" && event.startsAt >= now && event.startsAt <= inSevenDays).forEach(event => candidates.push({ type: "calendar", title: `Próximo: ${event.title}`, message: "Tienes una fecha programada en los próximos 7 días.", relatedEntityType: "calendar_event", relatedEntityId: event.id }));
        if (preferences.inAppEnabled && preferences.documentsEnabled) snapshot.documents.filter(document => document.expiresAt && document.expiresAt >= now && document.expiresAt <= inSevenDays).forEach(document => candidates.push({ type: "document", title: `Documento próximo a vencer: ${document.name}`, message: "Revisa el documento y su referencia antes de su vencimiento.", relatedEntityType: "document", relatedEntityId: document.id }));
        if (preferences.inAppEnabled && preferences.debtsEnabled) snapshot.debts.filter(debt => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= inSevenDays).forEach(debt => candidates.push({ type: "debt", title: `Vencimiento próximo: ${debt.name}`, message: "Revisa esta deuda y confirma manualmente su siguiente pago o ajuste.", relatedEntityType: "debt", relatedEntityId: debt.id }));
        if (preferences.inAppEnabled && preferences.debtsEnabled) creditCardAlertCandidates(snapshot.creditCards ?? [], now, 7).forEach(candidate => candidates.push(candidate));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        if (preferences.inAppEnabled && preferences.budgetEnabled) snapshot.budgets.filter(budget => budget.periodStart >= monthStart && budget.periodStart < nextMonthStart).forEach(budget => candidates.push({ type: "budget", title: "Revisión manual de presupuesto", message: "Revisa manualmente este presupuesto mensual frente a tus registros confirmados.", relatedEntityType: "budget", relatedEntityId: budget.id }));
        if (preferences.inAppEnabled && preferences.taxReserveEnabled && snapshot.profile?.futureTaxReserveCents > 0 && snapshot.profile.futureTaxDueAt && snapshot.profile.futureTaxDueAt >= now && snapshot.profile.futureTaxDueAt <= inSevenDays) candidates.push({ type: "tax_reserve", title: "Revisa tu reserva fiscal manual", message: "Hay una fecha de referencia cercana. Confirma tus datos antes de tomar cualquier decisión fiscal.", relatedEntityType: "financial_profile", relatedEntityId: snapshot.profile.id });
        if (preferences.inAppEnabled && preferences.reviewsEnabled && snapshot.workspaceAccess?.role !== "manager") snapshot.transactions.filter(transaction => transaction.reviewStatus === "pending_review").forEach(transaction => candidates.push({ type: "review", title: "Movimiento pendiente de revisión", message: "Hay un movimiento que espera confirmación humana.", relatedEntityType: "transaction", relatedEntityId: transaction.id }));
        const existing = await db.select().from(financeNotifications).where(eq(financeNotifications.userId, ctx.user.id));
        const existingKeys = new Set(existing.map(notification => `${notification.type}:${notification.relatedEntityType}:${notification.relatedEntityId}`));
        const pending = candidates.filter(candidate => !existingKeys.has(`${candidate.type}:${candidate.relatedEntityType}:${candidate.relatedEntityId}`));
        if (pending.length) await db.insert(financeNotifications).values(pending.map(candidate => ({ userId: ctx.user.id, ...candidate })));
        const notifications = pending.length ? await db.select().from(financeNotifications).where(eq(financeNotifications.userId, ctx.user.id)) : existing;
        const visibleTypes = new Set([preferences.calendarEnabled && "calendar", preferences.documentsEnabled && "document", preferences.debtsEnabled && "debt", preferences.debtsEnabled && "credit_card_cutoff", preferences.debtsEnabled && "credit_card_payment", preferences.debtsEnabled && "credit_card_overlimit", preferences.reviewsEnabled && "review", preferences.budgetEnabled && "budget", preferences.taxReserveEnabled && "tax_reserve"]);
        return { preferences, notifications: notifications.filter(notification => !notification.dismissedAt && visibleTypes.has(notification.type)).sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()) };
      }),
      savePreferences: privateFinanceProcedure.input(z.object({ inAppEnabled: z.boolean(), calendarEnabled: z.boolean(), documentsEnabled: z.boolean(), debtsEnabled: z.boolean(), reviewsEnabled: z.boolean(), budgetEnabled: z.boolean(), taxReserveEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
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
    transactions: router({
      save: privateFinanceProcedure.input(z.object({
        id: z.number().int().positive().optional(), accountId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(),
        type: z.enum(["income", "expense", "transfer_out", "transfer_in"]), scope: scopeSchema, amountCents: z.number().int().positive(), currency: z.string().length(3), occurredAt: z.number().int().positive(), isEssential: z.boolean(), transferGroupId: z.string().max(64).nullable().optional(), status: z.enum(["confirmed", "estimated", "needs_review"]), notes: z.string().max(3000).nullable().optional(),
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
          await tx.delete(financialTransactions).where(and(eq(financialTransactions.id, input.id), eq(financialTransactions.userId, ctx.user.id)));
        });
        return { success: true };
      }),
    }),
    documents: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().min(1).max(180), type: z.enum(["statement", "invoice", "contract", "policy", "tax", "receipt", "other"]), documentClass: z.enum(["general", "identity_residency", "tax_residency", "tax_filing", "insurance", "will_estate", "property", "investment_instrument", "loan_credit", "legal_contract"]).default("general"), scope: scopeSchema, relatedEntityType: z.enum(["none", "asset", "debt", "insurance", "tax", "estate"]).default("none"), relatedEntityId: z.number().int().positive().nullable().optional(), jurisdiction: z.string().max(120).nullable().optional(), referenceUrl: z.string().url().nullable().optional(), referenceProvider: z.enum(["google_drive", "url", "other"]).default("url"), issuedAt: optionalDate, expiresAt: optionalDate, reminderAt: optionalDate, verified: z.boolean(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, issuedAt, expiresAt, reminderAt, ...values } = input; const payload = { ...values, issuedAt: asDate(issuedAt), expiresAt: asDate(expiresAt), reminderAt: asDate(reminderAt) };
        if (id) await db.update(financeDocuments).set(payload).where(and(eq(financeDocuments.id, id), eq(financeDocuments.userId, ctx.user.id)));
        else await db.insert(financeDocuments).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financeDocuments, input.id, ctx.user.id)),
    }),
    calendar: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), title: z.string().min(1).max(180), eventType: z.enum(["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other"]), scope: scopeSchema, startsAt: z.number().int().positive(), endsAt: optionalDate, recurrence: z.enum(["none", "monthly", "quarterly", "yearly"]), amountCents: moneySchema.nullable().optional(), currency: z.string().length(3), linkedDebtId: z.number().int().positive().nullable().optional(), linkedDocumentId: z.number().int().positive().nullable().optional(), linkedTaskId: z.number().int().positive().nullable().optional(), status: z.enum(["planned", "completed", "cancelled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, startsAt, endsAt, ...values } = input; const payload = { ...values, startsAt: new Date(startsAt), endsAt: asDate(endsAt) };
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
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), entityId: z.number().int().positive().nullable().optional(), projectId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(1).max(140), creditor: z.string().trim().max(140).nullable().optional(), type: z.enum(["credit_card", "loan", "financed_purchase", "mortgage", "tax", "business", "family", "other"]), scope: scopeSchema, balanceCents: moneySchema, originalAmountCents: moneySchema.nullable().optional(), installmentCents: moneySchema.nullable().optional(), installmentCount: z.number().int().positive().max(600).nullable().optional(), financedItem: z.string().trim().max(180).nullable().optional(), purchasedAt: optionalDate, currency: z.string().length(3), interestRateBps: z.number().int().min(0).nullable().optional(), minimumPaymentCents: moneySchema, nextDueAt: optionalDate, endDate: optionalDate, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["active", "paid", "review"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        if (input.type === "financed_purchase" && input.originalAmountCents !== null && input.originalAmountCents !== undefined && input.originalAmountCents < input.balanceCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe original no puede ser menor que el saldo pendiente registrado." });
        if (input.type === "financed_purchase" && input.installmentCents && !input.installmentCount) throw new TRPCError({ code: "BAD_REQUEST", message: "Indica cuántas mensualidades tiene la compra financiada." });
        const { id, nextDueAt, endDate, purchasedAt, type, originalAmountCents, installmentCents, installmentCount, financedItem, ...values } = input;
        const financing = type === "financed_purchase"
          ? { originalAmountCents: originalAmountCents ?? null, installmentCents: installmentCents ?? null, installmentCount: installmentCount ?? null, financedItem: financedItem || null, purchasedAt: asDate(purchasedAt) }
          : { originalAmountCents: null, installmentCents: null, installmentCount: null, financedItem: null, purchasedAt: null };
        const payload = { ...values, type, ...financing, nextDueAt: asDate(nextDueAt), endDate: asDate(endDate) };
        if (id) await db.update(debts).set(payload).where(and(eq(debts.id, id), eq(debts.userId, ctx.user.id)));
        else await db.insert(debts).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      paymentSave: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), debtId: z.number().int().positive(), linkedTransactionId: z.number().int().positive().nullable().optional(), totalPaymentCents: z.number().int().positive(), principalCents: z.number().int().positive(), currency: z.string().length(3), paidAt: z.number().int().positive(), nextDueAt: optionalDate, notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        if (input.principalCents > input.totalPaymentCents) throw new TRPCError({ code: "BAD_REQUEST", message: "La reducción de principal no puede superar el pago total." });
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
            if (!expense || expense.type !== "expense" || expense.currency !== input.currency || expense.reviewStatus !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un gasto aprobado, de la misma moneda y de tu espacio privado." });
            const linkedPayments = await tx.select().from(debtPayments).where(and(eq(debtPayments.userId, ctx.user.id), eq(debtPayments.linkedTransactionId, expense.id)));
            const usedFromExpense = linkedPayments.filter(item => item.id !== input.id).reduce((sum, item) => sum + item.totalPaymentCents, 0);
            if (usedFromExpense + input.totalPaymentCents > expense.amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe vinculado supera el gasto real seleccionado." });
            await tx.update(financialTransactions).set({ debtId: debt.id }).where(and(eq(financialTransactions.id, expense.id), eq(financialTransactions.userId, ctx.user.id)));
          }
          const payload = { debtId: debt.id, linkedTransactionId: input.linkedTransactionId ?? null, totalPaymentCents: input.totalPaymentCents, principalCents: input.principalCents, currency: input.currency, paidAt: new Date(input.paidAt), notes: input.notes ?? null };
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
    tasks: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), title: z.string().min(1).max(180), area: z.enum(["budget", "debt", "savings", "investment", "tax", "documents", "business", "review", "other"]), scope: scopeSchema, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["pending", "in_progress", "waiting", "completed", "cancelled"]), dueAt: optionalDate, goalId: z.number().int().positive().nullable().optional(), debtId: z.number().int().positive().nullable().optional(), requiresConfirmation: z.boolean(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, dueAt, ...values } = input; const payload = { ...values, dueAt: asDate(dueAt) };
        if (id) await db.update(financeTasks).set(payload).where(and(eq(financeTasks.id, id), eq(financeTasks.userId, ctx.user.id)));
        else await db.insert(financeTasks).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financeTasks, input.id, ctx.user.id)),
    }),
    reviews: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), periodStart: z.number().int().positive(), status: z.enum(["draft", "reviewed", "closed"]), incomeCents: moneySchema, expenseCents: moneySchema, netCashFlowCents: z.number().int(), observations: z.string().max(5000).nullable().optional(), nextActions: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, periodStart, ...values } = input; const payload = { ...values, periodStart: new Date(periodStart) };
        if (id) await db.update(monthlyReviews).set(payload).where(and(eq(monthlyReviews.id, id), eq(monthlyReviews.userId, ctx.user.id)));
        else await db.insert(monthlyReviews).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
    }),
    statements: router({
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
          const existing = await db.select({ id: monthlyFinancialStatements.id }).from(monthlyFinancialStatements).where(and(eq(monthlyFinancialStatements.userId, ctx.user.id), eq(monthlyFinancialStatements.scope, input.scope), eq(monthlyFinancialStatements.periodStart, start), input.entityId ? eq(monthlyFinancialStatements.entityId, input.entityId) : isNull(monthlyFinancialStatements.entityId), input.projectId ? eq(monthlyFinancialStatements.projectId, input.projectId) : isNull(monthlyFinancialStatements.projectId), input.currency ? eq(monthlyFinancialStatements.filterCurrency, input.currency) : isNull(monthlyFinancialStatements.filterCurrency), input.reviewStatus ? eq(monthlyFinancialStatements.filterReviewStatus, input.reviewStatus) : isNull(monthlyFinancialStatements.filterReviewStatus))).limit(1);
          if (existing[0]) await db.update(monthlyFinancialStatements).set(payload).where(eq(monthlyFinancialStatements.id, existing[0].id));
          else await db.insert(monthlyFinancialStatements).values({ userId: ctx.user.id, ...payload });
        }
        return { success: true, statement: calculated };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(monthlyFinancialStatements, input.id, ctx.user.id)),
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
          const response = await invokeLLM({
            model: "gpt-5-mini",
            reasoning: { effort: "low" },
            maxTokens: 1_200,
            requestTimeoutMs: 45_000,
            maxRetries: 0,
            messages: [
              { role: "system", content: `Eres Mexi, el asistente privado y explicable de Meximoney. ${manualOnlyNotice} Usa exclusivamente el JSON de registros manuales suministrado en este mensaje y la pregunta de la usuaria. No uses búsqueda web, conocimientos externos, precios de mercado, normas fiscales actuales ni herramientas. No inventes datos. Si falta información, dilo de forma explícita y propone qué registro manual se debe crear o actualizar. No des instrucciones para transferir, pagar, comprar, vender, contratar ni cancelar productos financieros. Ofrece análisis educativo, explica cálculos y distingue entre datos, supuestos, riesgos y próximos pasos. Responde siempre en español y usa importes en centavos solo si explicas el formato. Cierra con la frase: "Sin conexiones bancarias ni acciones financieras ejecutadas."` },
              { role: "user", content: `REGISTROS MANUALES DE MEXIMONEY:\n${createManualSnapshotText(snapshot)}\n\nPREGUNTA DE LA USUARIA:\n${input.message}` },
            ],
          });
          const content = response.choices[0]?.message?.content;
          const normalizedContent = typeof content === "string" ? content.trim() : "";
          return { content: normalizedContent || "Mexi recibió tus registros manuales, pero el modelo no devolvió texto utilizable. Reintenta la consulta; tus datos no se han modificado.", notice: manualOnlyNotice };
        } catch (error) {
          console.error("[Mexi] Analysis unavailable:", error);
          return { content: "Mexi no pudo obtener una respuesta del servicio de IA en este momento. Tus datos no se han modificado. Puedes volver a intentarlo más tarde o revisar el panel, los controles de calidad y el cierre mensual manual.", notice: manualOnlyNotice };
        }
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
