import { describe, expect, it } from "vitest";
import { buildMonthlyControlSummary } from "./monthlyControl";

describe("buildMonthlyControlSummary", () => {
  it("concentra referencias manuales sin alterar ni estimar sus datos", () => {
    const period = new Date("2026-08-01T12:00:00.000Z");
    const summary = buildMonthlyControlSummary({
      transactions: [{ reviewStatus: "pending_review" }, { reviewStatus: "approved" }],
      dashboard: { qualityIssues: [{ code: "stale_account" }, { code: "missing_category" }, { code: "pending_debt_conversion" }] },
      calendarEvents: [{ status: "planned", startsAt: new Date("2026-08-09T12:00:00.000Z") }],
      tasks: [{ status: "pending", dueAt: new Date("2026-08-11T12:00:00.000Z") }],
      debts: [{ status: "active", nextDueAt: new Date("2026-08-15T12:00:00.000Z") }, { status: "active", nextDueAt: null }],
      creditCards: [{ status: "active", paymentDueDay: 18, statementClosingDay: 8 }, { status: "active", paymentDueDay: null, statementClosingDay: null }],
      fiscalRecords: [{ periodStart: new Date("2026-08-01T12:00:00.000Z"), reviewStatus: "pending_review" }],
      fiscalPeriodReviews: [{ periodStart: new Date("2026-08-01T12:00:00.000Z"), status: "reviewed" }],
      statements: [{ periodStart: new Date("2026-08-01T12:00:00.000Z"), status: "closed" }],
    }, period);

    expect(summary).toMatchObject({
      pendingTransactionCount: 1,
      qualityIssueCount: 3,
      scheduledItemCount: 2,
      obligationCount: 2,
      missingObligationDateCount: 2,
      fiscalPendingCount: 1,
      fiscalRecordCount: 1,
      fiscalRoutineReviewed: true,
      hasClosedStatement: true,
      patrimonyAttentionCount: 2,
    });
  });
});
