import { COOKIE_NAME } from "@shared/const";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  accounts,
  budgets,
  calendarEvents,
  categories,
  debts,
  decisionRecords,
  financeDocuments,
  financeTasks,
  financialGoals,
  financialProfiles,
  financialTransactions,
  monthlyReviews,
  monthlyFinancialStatements,
  localCredentials,
  privacyConsents,
  users,
} from "../drizzle/schema";
import { hashPassword, verifyPassword } from "./credentials";
import { deleteAllFinancialData, deleteOwnedRow, getFinanceSnapshot, getProfile, requireDb } from "./db";
import { calculateMonthlyStatement, monthBounds } from "./finance";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const scopeSchema = z.enum(["personal", "business", "mixed"]);
const moneySchema = z.number().int().min(0);
const optionalDate = z.number().int().positive().nullable().optional();
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

function asDate(value: number | null | undefined) {
  return value ? new Date(value) : null;
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
    profile: router({
      get: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
      save: privateFinanceProcedure.input(z.object({
        currency: z.string().length(3).default("MXN"),
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
        const db = await requireDb();
        const { futureTaxDueAt, ...profileValues } = input;
        await db.insert(financialProfiles).values({ userId: ctx.user.id, ...profileValues, futureTaxDueAt: asDate(futureTaxDueAt) }).onDuplicateKeyUpdate({ set: { ...profileValues, futureTaxDueAt: asDate(futureTaxDueAt) } });
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
        id: z.number().int().positive().optional(), name: z.string().min(1).max(140),
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
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financialTransactions, input.id, ctx.user.id)),
    }),
    documents: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(180), type: z.enum(["statement", "invoice", "contract", "policy", "tax", "receipt", "other"]), documentClass: z.enum(["general", "identity_residency", "tax_residency", "tax_filing", "insurance", "will_estate", "property", "investment_instrument", "loan_credit", "legal_contract"]).default("general"), scope: scopeSchema, relatedEntityType: z.enum(["none", "asset", "debt", "insurance", "tax", "estate"]).default("none"), relatedEntityId: z.number().int().positive().nullable().optional(), jurisdiction: z.string().max(120).nullable().optional(), referenceUrl: z.string().url().nullable().optional(), issuedAt: optionalDate, expiresAt: optionalDate, reminderAt: optionalDate, verified: z.boolean(), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, issuedAt, expiresAt, reminderAt, ...values } = input; const payload = { ...values, issuedAt: asDate(issuedAt), expiresAt: asDate(expiresAt), reminderAt: asDate(reminderAt) };
        if (id) await db.update(financeDocuments).set(payload).where(and(eq(financeDocuments.id, id), eq(financeDocuments.userId, ctx.user.id)));
        else await db.insert(financeDocuments).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(financeDocuments, input.id, ctx.user.id)),
    }),
    calendar: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), title: z.string().min(1).max(180), eventType: z.enum(["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other"]), scope: scopeSchema, startsAt: z.number().int().positive(), endsAt: optionalDate, recurrence: z.enum(["none", "monthly", "quarterly", "yearly"]), amountCents: moneySchema.nullable().optional(), currency: z.string().length(3), linkedDebtId: z.number().int().positive().nullable().optional(), linkedDocumentId: z.number().int().positive().nullable().optional(), linkedTaskId: z.number().int().positive().nullable().optional(), status: z.enum(["planned", "completed", "cancelled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, startsAt, endsAt, ...values } = input; const payload = { ...values, startsAt: new Date(startsAt), endsAt: asDate(endsAt) };
        if (id) await db.update(calendarEvents).set(payload).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, ctx.user.id)));
        else await db.insert(calendarEvents).values({ userId: ctx.user.id, ...payload });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(calendarEvents, input.id, ctx.user.id)),
    }),
    budgets: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), categoryId: z.number().int().positive().nullable().optional(), scope: scopeSchema, periodStart: z.number().int().positive(), plannedCents: moneySchema, type: z.enum(["income", "expense"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, periodStart, ...values } = input; const payload = { ...values, periodStart: new Date(periodStart) };
        if (id) await db.update(budgets).set(payload).where(and(eq(budgets.id, id), eq(budgets.userId, ctx.user.id)));
        else await db.insert(budgets).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(budgets, input.id, ctx.user.id)),
    }),
    debts: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(140), creditor: z.string().max(140).nullable().optional(), type: z.enum(["credit_card", "loan", "mortgage", "tax", "business", "family", "other"]), scope: scopeSchema, balanceCents: moneySchema, currency: z.string().length(3), interestRateBps: z.number().int().min(0).nullable().optional(), minimumPaymentCents: moneySchema, nextDueAt: optionalDate, endDate: optionalDate, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["active", "paid", "review"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const { id, nextDueAt, endDate, ...values } = input; const payload = { ...values, nextDueAt: asDate(nextDueAt), endDate: asDate(endDate) };
        if (id) await db.update(debts).set(payload).where(and(eq(debts.id, id), eq(debts.userId, ctx.user.id)));
        else await db.insert(debts).values({ userId: ctx.user.id, ...payload }); return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteOwnedRow(debts, input.id, ctx.user.id)),
    }),
    goals: router({
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(160), type: z.enum(["emergency", "debt", "housing", "retirement", "investment", "education", "business", "other"]), scope: scopeSchema, targetCents: z.number().int().positive(), currentCents: moneySchema, monthlyContributionCents: moneySchema, currency: z.string().length(3), targetDate: optionalDate, priority: z.enum(["critical", "high", "medium", "low"]), status: z.enum(["active", "paused", "achieved", "cancelled"]), notes: z.string().max(3000).nullable().optional() })).mutation(async ({ ctx, input }) => {
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
      preview: privateFinanceProcedure.input(z.object({ periodStart: z.number().int().positive(), scope: scopeSchema })).query(async ({ ctx, input }) => {
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        const { start, end } = monthBounds(new Date(input.periodStart));
        return calculateMonthlyStatement(snapshot.transactions, snapshot.accounts, snapshot.debts, start, end, input.scope);
      }),
      save: privateFinanceProcedure.input(z.object({ id: z.number().int().positive().optional(), periodStart: z.number().int().positive(), scope: scopeSchema, status: z.enum(["draft", "closed"]), notes: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const snapshot = await getFinanceSnapshot(ctx.user.id);
        const { start, end } = monthBounds(new Date(input.periodStart));
        const calculated = calculateMonthlyStatement(snapshot.transactions, snapshot.accounts, snapshot.debts, start, end, input.scope);
        const payload = { ...calculated, periodStart: start, scope: input.scope, status: input.status, notes: input.notes ?? null };
        if (input.id) {
          await db.update(monthlyFinancialStatements).set(payload).where(and(eq(monthlyFinancialStatements.id, input.id), eq(monthlyFinancialStatements.userId, ctx.user.id)));
        } else {
          const existing = await db.select({ id: monthlyFinancialStatements.id }).from(monthlyFinancialStatements).where(and(eq(monthlyFinancialStatements.userId, ctx.user.id), eq(monthlyFinancialStatements.scope, input.scope), eq(monthlyFinancialStatements.periodStart, start))).limit(1);
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
