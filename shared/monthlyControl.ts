export type MonthlyControlSummary = {
  pendingTransactionCount: number;
  qualityIssueCount: number;
  scheduledItemCount: number;
  obligationCount: number;
  missingObligationDateCount: number;
  fiscalPendingCount: number;
  fiscalRecordCount: number;
  fiscalRoutineReviewed: boolean;
  hasClosedStatement: boolean;
  patrimonyAttentionCount: number;
};

function isInPeriod(value: Date | string | null | undefined, periodStart: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === periodStart.getFullYear() && date.getMonth() === periodStart.getMonth();
}

export function buildMonthlyControlSummary(snapshot: any, periodStart: Date): MonthlyControlSummary {
  const transactions = snapshot.transactions ?? [];
  const debts = snapshot.debts ?? [];
  const cards = snapshot.creditCards ?? [];
  const tasks = snapshot.tasks ?? [];
  const calendarEvents = snapshot.calendarEvents ?? [];
  const fiscalRecords = (snapshot.fiscalRecords ?? []).filter((record: any) => isInPeriod(record.periodStart, periodStart));
  const fiscalReview = (snapshot.fiscalPeriodReviews ?? []).find((review: any) => isInPeriod(review.periodStart, periodStart));
  const closedStatement = (snapshot.statements ?? []).some((statement: any) => statement.status === "closed" && isInPeriod(statement.periodStart, periodStart));
  const activeDebts = debts.filter((debt: any) => debt.status === "active" || debt.status === "review");
  const activeCards = cards.filter((card: any) => card.status === "active");
  const scheduledEvents = calendarEvents.filter((event: any) => event.status === "planned" && isInPeriod(event.startsAt, periodStart));
  const scheduledTasks = tasks.filter((task: any) => task.status !== "completed" && task.status !== "cancelled" && isInPeriod(task.dueAt, periodStart));
  const debtDue = activeDebts.filter((debt: any) => isInPeriod(debt.nextDueAt, periodStart));
  const cardDue = activeCards.filter((card: any) => card.paymentDueDay && card.paymentDueDay >= 1 && card.paymentDueDay <= 31);

  return {
    pendingTransactionCount: transactions.filter((transaction: any) => transaction.reviewStatus === "draft" || transaction.reviewStatus === "pending_review").length,
    qualityIssueCount: snapshot.dashboard?.qualityIssues?.length ?? 0,
    scheduledItemCount: scheduledEvents.length + scheduledTasks.length,
    obligationCount: debtDue.length + cardDue.length,
    missingObligationDateCount: activeDebts.filter((debt: any) => !debt.nextDueAt).length + activeCards.filter((card: any) => !card.paymentDueDay || !card.statementClosingDay).length,
    fiscalPendingCount: fiscalRecords.filter((record: any) => record.reviewStatus === "draft" || record.reviewStatus === "pending_review").length,
    fiscalRecordCount: fiscalRecords.length,
    fiscalRoutineReviewed: fiscalReview?.status === "reviewed",
    hasClosedStatement: closedStatement,
    patrimonyAttentionCount: (snapshot.dashboard?.qualityIssues ?? []).filter((issue: any) => String(issue.code).includes("account") || String(issue.code).includes("investment") || String(issue.code).includes("debt")).length,
  };
}
