import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accounts,
  budgets,
  categories,
  debts,
  decisionRecords,
  financeDocuments,
  financeTasks,
  financialGoals,
  financialProfiles,
  financialTransactions,
  InsertUser,
  monthlyReviews,
  privacyConsents,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { calculateLiquidity, calculateNetWorth, monthBounds, summarizeCashFlow, transferIntegrityIssues, withNetCashFlow } from "./finance";

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

export async function getFinanceSnapshot(userId: number, referenceDate = new Date()) {
  const db = await requireDb();
  const [profile, accountRows, categoryRows, transactionRows, budgetRows, debtRows, goalRows, taskRows, reviewRows, documentRows, decisionRows] = await Promise.all([
    getProfile(userId),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(financialTransactions).where(eq(financialTransactions.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(debts).where(eq(debts.userId, userId)),
    db.select().from(financialGoals).where(eq(financialGoals.userId, userId)),
    db.select().from(financeTasks).where(eq(financeTasks.userId, userId)),
    db.select().from(monthlyReviews).where(eq(monthlyReviews.userId, userId)),
    db.select().from(financeDocuments).where(eq(financeDocuments.userId, userId)),
    db.select().from(decisionRecords).where(eq(decisionRecords.userId, userId)),
  ]);

  const { start, end } = monthBounds(referenceDate);
  const cashFlow = withNetCashFlow(summarizeCashFlow(transactionRows, start, end));
  const netWorth = calculateNetWorth(accountRows, debtRows);
  const essentialExpensesCents = transactionRows
    .filter(item => item.type === "expense" && item.isEssential && item.occurredAt >= start && item.occurredAt < end)
    .reduce((sum, item) => sum + item.amountCents, 0) || profile?.referenceEssentialExpensesCents || 0;
  const liquidity = calculateLiquidity(accountRows, essentialExpensesCents);
  const qualityIssues = [
    ...transactionRows
      .filter(item => (item.type === "income" || item.type === "expense") && !item.categoryId)
      .map(item => ({ code: "missing_category", severity: "medium", label: `Movimiento sin categoría: ${item.notes || `#${item.id}`}` })),
    ...transactionRows
      .filter(item => !item.accountId)
      .map(item => ({ code: "missing_account", severity: "high", label: `Movimiento sin cuenta: ${item.notes || `#${item.id}`}` })),
    ...accountRows
      .filter(item => !item.valuationDate || item.valuationDate.getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000)
      .map(item => ({ code: "stale_account", severity: "medium", label: `Valor por actualizar: ${item.name}` })),
    ...transferIntegrityIssues(transactionRows).map(groupId => ({ code: "transfer_mismatch", severity: "high", label: `Transferencia incoherente: ${groupId}` })),
    ...debtRows
      .filter(item => item.status === "active" && !item.nextDueAt)
      .map(item => ({ code: "missing_debt_due_date", severity: "medium", label: `Vencimiento pendiente: ${item.name}` })),
    ...goalRows
      .filter(item => item.status === "active" && !item.targetDate)
      .map(item => ({ code: "missing_goal_date", severity: "low", label: `Fecha objetivo pendiente: ${item.name}` })),
  ];

  return {
    profile,
    accounts: accountRows,
    categories: categoryRows,
    transactions: transactionRows,
    budgets: budgetRows,
    debts: debtRows,
    goals: goalRows,
    tasks: taskRows,
    reviews: reviewRows,
    documents: documentRows,
    decisions: decisionRows,
    dashboard: { periodStart: start, cashFlow, netWorth, liquidity, essentialExpensesCents, qualityIssues },
  };
}

export async function deleteOwnedRow(table: typeof accounts | typeof categories | typeof financialTransactions | typeof budgets | typeof debts | typeof financialGoals | typeof financeTasks | typeof financeDocuments | typeof decisionRecords, id: number, userId: number) {
  const db = await requireDb();
  await db.delete(table).where(and(eq(table.id, id), eq(table.userId, userId)));
}

export async function deleteAllFinancialData(userId: number) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.delete(financialTransactions).where(eq(financialTransactions.userId, userId));
    await tx.delete(budgets).where(eq(budgets.userId, userId));
    await tx.delete(financeDocuments).where(eq(financeDocuments.userId, userId));
    await tx.delete(financeTasks).where(eq(financeTasks.userId, userId));
    await tx.delete(monthlyReviews).where(eq(monthlyReviews.userId, userId));
    await tx.delete(decisionRecords).where(eq(decisionRecords.userId, userId));
    await tx.delete(financialGoals).where(eq(financialGoals.userId, userId));
    await tx.delete(debts).where(eq(debts.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(financialProfiles).where(eq(financialProfiles.userId, userId));
    await tx.delete(privacyConsents).where(eq(privacyConsents.userId, userId));
  });
}
