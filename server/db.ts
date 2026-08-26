import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  financialContacts,
  fiscalPeriodReviews,
  fiscalRecords,
  financeDocuments,
  financeTasks,
  financialGoals,
  financialProfiles,
  financialProjects,
  financialTransactions,
  investments,
  investmentOperations,
  InsertUser,
  monthlyReviewControls,
  monthlyReviews,
  monthlyFinancialStatements,
  payablePayments,
  payables,
  passwordResetEvents,
  passwordResetTokens,
  privacyConsents,
  qualityIssueAcknowledgements,
  receivables,
  receivablePayments,
  recurringTemplates,
  surplusAllocationPolicies,
  users,
  workspaceEntities,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { calculateLiquidity, calculateNetWorth, monthBounds, reportedAmountCents, summarizeCashFlowInReportCurrency, transferIntegrityIssues, withNetCashFlow } from "./finance";
import { comparableInvestmentValueCents, investmentNeedsManualConversion } from "./investmentData";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible. Inténtalo de nuevo.");
  return db;
}

export async function getProfile(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export type WorkspaceAccess = {
  ownerId: number;
  role: "owner" | "manager" | "reviewer";
  canCreateDrafts: boolean;
  canReview: boolean;
};

export async function resolveWorkspaceAccess(userId: number): Promise<WorkspaceAccess> {
  const db = await requireDb();
  const user = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const email = user[0]?.email?.toLowerCase();
  if (!email) return { ownerId: userId, role: "owner", canCreateDrafts: true, canReview: true };
  const invite = await db.select().from(collaborationInvites).where(and(eq(collaborationInvites.invitedEmail, email), eq(collaborationInvites.status, "accepted"), eq(collaborationInvites.acceptedByUserId, userId))).limit(1);
  if (!invite[0]) return { ownerId: userId, role: "owner", canCreateDrafts: true, canReview: true };
  return { ownerId: invite[0].ownerId, role: invite[0].role, canCreateDrafts: invite[0].canCreateDrafts, canReview: invite[0].canReview };
}

export async function getFinanceSnapshot(userId: number, referenceDate = new Date()) {
  const db = await requireDb();
  const access = await resolveWorkspaceAccess(userId);
  const ownerId = access.ownerId;
  const [profile, accountRows, categoryRows, transactionRows, budgetRows, debtRows, debtPaymentRows, creditCardRows, goalRows, taskRows, reviewRows, monthlyControlRows, statementRows, calendarColorRows, calendarEventRows, documentRows, decisionRows, entityRows, projectRows, exchangeRateRows, inviteRows, contactRows, receivableRows, receivablePaymentRows, fiscalRecordRows, fiscalPeriodReviewRows, templateRows, payableRows, payablePaymentRows, investmentRows, investmentOperationRows, qualityAcknowledgementRows, surplusPolicyRows] = await Promise.all([
    getProfile(ownerId),
    db.select().from(accounts).where(eq(accounts.userId, ownerId)),
    db.select().from(categories).where(eq(categories.userId, ownerId)),
    db.select().from(financialTransactions).where(eq(financialTransactions.userId, ownerId)),
    db.select().from(budgets).where(eq(budgets.userId, ownerId)),
    db.select().from(debts).where(eq(debts.userId, ownerId)),
    db.select().from(debtPayments).where(eq(debtPayments.userId, ownerId)),
    db.select().from(creditCards).where(eq(creditCards.userId, ownerId)),
    db.select().from(financialGoals).where(eq(financialGoals.userId, ownerId)),
    db.select().from(financeTasks).where(eq(financeTasks.userId, ownerId)),
    db.select().from(monthlyReviews).where(eq(monthlyReviews.userId, ownerId)),
    db.select().from(monthlyReviewControls).where(eq(monthlyReviewControls.userId, ownerId)),
    db.select().from(monthlyFinancialStatements).where(eq(monthlyFinancialStatements.userId, ownerId)),
    db.select().from(calendarColorPreferences).where(eq(calendarColorPreferences.userId, ownerId)),
    db.select().from(calendarEvents).where(eq(calendarEvents.userId, ownerId)),
    db.select().from(financeDocuments).where(eq(financeDocuments.userId, ownerId)),
    db.select().from(decisionRecords).where(eq(decisionRecords.userId, ownerId)),
    db.select().from(workspaceEntities).where(eq(workspaceEntities.ownerId, ownerId)),
    db.select().from(financialProjects).where(eq(financialProjects.ownerId, ownerId)),
    db.select().from(exchangeRates).where(eq(exchangeRates.ownerId, ownerId)),
    db.select().from(collaborationInvites).where(eq(collaborationInvites.ownerId, ownerId)),
    db.select().from(financialContacts).where(eq(financialContacts.userId, ownerId)),
    db.select().from(receivables).where(eq(receivables.userId, ownerId)),
    db.select().from(receivablePayments).where(eq(receivablePayments.userId, ownerId)),
    db.select().from(fiscalRecords).where(eq(fiscalRecords.userId, ownerId)),
    db.select().from(fiscalPeriodReviews).where(eq(fiscalPeriodReviews.userId, ownerId)),
    db.select().from(recurringTemplates).where(eq(recurringTemplates.userId, ownerId)),
    db.select().from(payables).where(eq(payables.userId, ownerId)),
    db.select().from(payablePayments).where(eq(payablePayments.userId, ownerId)),
    db.select().from(investments).where(eq(investments.userId, ownerId)),
    db.select().from(investmentOperations).where(eq(investmentOperations.userId, ownerId)),
    db.select().from(qualityIssueAcknowledgements).where(eq(qualityIssueAcknowledgements.userId, ownerId)),
    db.select().from(surplusAllocationPolicies).where(eq(surplusAllocationPolicies.userId, ownerId)).limit(1),
  ]);

  const { start, end } = monthBounds(referenceDate);
  const reportCurrency = (profile?.currency || "MXN").toUpperCase();
  const cashFlow = withNetCashFlow(summarizeCashFlowInReportCurrency(transactionRows, start, end, reportCurrency));
  const reportCurrencyAccounts = accountRows.filter(item => item.currency === reportCurrency);
  const reportCurrencyInvestments = investmentRows.map(item => ({ item, valueCents: comparableInvestmentValueCents(item, reportCurrency) })).filter((item): item is { item: typeof investmentRows[number]; valueCents: number } => item.valueCents !== null).map(({ item, valueCents }) => ({ ...item, currency: reportCurrency, currentValueCents: valueCents, isLiquid: false }));
  const investmentNetWorthAssets = reportCurrencyInvestments.map(item => ({ currentValueCents: item.currentValueCents, status: "active" as const }));
  const reportCurrencyDebts = [...debtRows, ...creditCardRows.filter(card => card.status !== "closed").map(card => ({ ...card, balanceCents: card.balanceCents, status: "active" as const }))].filter(item => item.currency === reportCurrency);
  const netWorth = calculateNetWorth([...reportCurrencyAccounts, ...investmentNetWorthAssets], reportCurrencyDebts);
  const essentialExpensesCents = transactionRows
    .filter(item => item.type === "expense" && item.isEssential && item.occurredAt >= start && item.occurredAt < end)
    .reduce((sum, item) => sum + (reportedAmountCents(item, reportCurrency) ?? 0), 0) || profile?.referenceEssentialExpensesCents || 0;
  const liquidity = calculateLiquidity(reportCurrencyAccounts, essentialExpensesCents);
  const derivedQualityIssues = [
    ...transactionRows
      .filter(item => (item.type === "income" || item.type === "expense") && !item.categoryId)
      .map(item => ({ code: "missing_category", severity: "medium", label: `Movimiento sin categoría: ${item.notes || `#${item.id}`}` })),
    ...transactionRows
      .filter(item => !item.accountId && !item.creditCardId && !item.debtId)
      .map(item => ({ code: "missing_account", severity: "high", label: `Movimiento sin cuenta: ${item.notes || `#${item.id}`}` })),
    ...transactionRows
      .filter(item => (item.type === "income" || item.type === "expense") && reportedAmountCents(item, reportCurrency) === null)
      .map(item => ({ code: "pending_currency_conversion", severity: "high", label: `Conversión a ${reportCurrency} pendiente: ${item.notes || `#${item.id}`}` })),
    ...accountRows
      .filter(item => !item.valuationDate || item.valuationDate.getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000)
      .map(item => ({ code: "stale_account", severity: "medium", label: `Valor por actualizar: ${item.name}` })),
    ...accountRows
      .filter(item => item.status === "active" && item.currency !== reportCurrency)
      .map(item => ({ code: "pending_account_conversion", severity: "high", label: `Activo fuera de ${reportCurrency}, pendiente de valoración comparable: ${item.name}` })),
    ...investmentRows
      .filter(item => item.status === "active" && (!item.valuationDate || item.valuationDate.getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000))
      .map(item => ({ code: "stale_investment", severity: "medium", label: `Valuación de inversión por actualizar: ${item.name}` })),
    ...investmentRows
      .filter(item => investmentNeedsManualConversion(item, reportCurrency))
      .map(item => ({ code: "pending_investment_conversion", severity: "high", label: `Inversión fuera de ${reportCurrency}, pendiente de valoración comparable: ${item.name}` })),
    ...debtRows
      .filter(item => (item.status === "active" || item.status === "review") && item.currency !== reportCurrency)
      .map(item => ({ code: "pending_debt_conversion", severity: "high", label: `Pasivo fuera de ${reportCurrency}, pendiente de valoración comparable: ${item.name}` })),
    ...transferIntegrityIssues(transactionRows).map(groupId => ({ code: "transfer_mismatch", severity: "high", label: `Transferencia incoherente: ${groupId}` })),
    ...debtRows
      .filter(item => item.status === "active" && !item.nextDueAt)
      .map(item => ({ code: "missing_debt_due_date", severity: "medium", label: `Vencimiento pendiente: ${item.name}` })),
    ...creditCardRows
      .filter(item => item.status === "active" && (!item.paymentDueDay || !item.statementClosingDay))
      .map(item => ({ code: "missing_credit_card_cycle", severity: "medium", label: `Corte o fecha de pago pendiente: ${item.name}` })),
    ...goalRows
      .filter(item => item.status === "active" && !item.targetDate)
      .map(item => ({ code: "missing_goal_date", severity: "low", label: `Fecha objetivo pendiente: ${item.name}` })),
  ];
  const acknowledgedKeys = new Set(qualityAcknowledgementRows.map(item => item.issueKey));
  const qualityIssues = derivedQualityIssues
    .map(issue => ({ ...issue, key: `${issue.code}:${issue.label}` }))
    .filter(issue => !acknowledgedKeys.has(issue.key));

  return {
    profile,
    workspaceAccess: access,
    entities: entityRows,
    projects: projectRows,
    exchangeRates: exchangeRateRows,
    collaborators: inviteRows,
    contacts: contactRows,
    qualityAcknowledgements: qualityAcknowledgementRows,
    accounts: accountRows,
    categories: categoryRows,
    transactions: transactionRows,
    budgets: budgetRows,
    debts: debtRows,
    debtPayments: debtPaymentRows,
    creditCards: creditCardRows,
    goals: goalRows,
    tasks: taskRows,
    reviews: reviewRows,
    monthlyReviewControls: monthlyControlRows,
    statements: statementRows,
    calendarColors: calendarColorRows,
    calendarEvents: calendarEventRows,
    documents: documentRows,
    receivables: receivableRows,
    receivablePayments: receivablePaymentRows,
    fiscalRecords: fiscalRecordRows,
    fiscalPeriodReviews: fiscalPeriodReviewRows,
    recurringTemplates: templateRows,
    payables: payableRows,
    payablePayments: payablePaymentRows,
    investments: investmentRows,
    investmentOperations: investmentOperationRows,
    surplusAllocationPolicy: surplusPolicyRows[0] ?? null,
    decisions: decisionRows,
    dashboard: { periodStart: start, reportCurrency, cashFlow, netWorth, liquidity, essentialExpensesCents, qualityIssues },
  };
}

export async function deleteOwnedRow(table: typeof accounts | typeof categories | typeof financialTransactions | typeof budgets | typeof debts | typeof debtPayments | typeof creditCards | typeof financialGoals | typeof financeTasks | typeof financeDocuments | typeof decisionRecords | typeof calendarEvents | typeof monthlyFinancialStatements | typeof receivables | typeof receivablePayments | typeof fiscalRecords | typeof recurringTemplates | typeof payables | typeof payablePayments | typeof investments | typeof investmentOperations, id: number, userId: number) {
  const db = await requireDb();
  await db.delete(table).where(and(eq(table.id, id), eq(table.userId, userId)));
}

export async function deleteAllFinancialData(userId: number) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.delete(financialTransactions).where(eq(financialTransactions.userId, userId));
    await tx.delete(debtPayments).where(eq(debtPayments.userId, userId));
    await tx.delete(receivablePayments).where(eq(receivablePayments.userId, userId));
    await tx.delete(receivables).where(eq(receivables.userId, userId));
    await tx.delete(fiscalPeriodReviews).where(eq(fiscalPeriodReviews.userId, userId));
    await tx.delete(fiscalRecords).where(eq(fiscalRecords.userId, userId));
    await tx.delete(payablePayments).where(eq(payablePayments.userId, userId));
    await tx.delete(payables).where(eq(payables.userId, userId));
    await tx.delete(investmentOperations).where(eq(investmentOperations.userId, userId));
    await tx.delete(investments).where(eq(investments.userId, userId));
    await tx.delete(recurringTemplates).where(eq(recurringTemplates.userId, userId));
    await tx.delete(financialContacts).where(eq(financialContacts.userId, userId));
    await tx.delete(budgets).where(eq(budgets.userId, userId));
    await tx.delete(calendarColorPreferences).where(eq(calendarColorPreferences.userId, userId));
    await tx.delete(calendarEvents).where(eq(calendarEvents.userId, userId));
    await tx.delete(financeDocuments).where(eq(financeDocuments.userId, userId));
    await tx.delete(financeTasks).where(eq(financeTasks.userId, userId));
    await tx.delete(monthlyReviewControls).where(eq(monthlyReviewControls.userId, userId));
    await tx.delete(monthlyReviews).where(eq(monthlyReviews.userId, userId));
    await tx.delete(surplusAllocationPolicies).where(eq(surplusAllocationPolicies.userId, userId));
    await tx.delete(monthlyFinancialStatements).where(eq(monthlyFinancialStatements.userId, userId));
    await tx.delete(decisionRecords).where(eq(decisionRecords.userId, userId));
    await tx.delete(financialGoals).where(eq(financialGoals.userId, userId));
    await tx.delete(debts).where(eq(debts.userId, userId));
    await tx.delete(creditCards).where(eq(creditCards.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(financialProfiles).where(eq(financialProfiles.userId, userId));
    await tx.delete(privacyConsents).where(eq(privacyConsents.userId, userId));
    await tx.delete(qualityIssueAcknowledgements).where(eq(qualityIssueAcknowledgements.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(passwordResetEvents).where(eq(passwordResetEvents.userId, userId));
  });
}
