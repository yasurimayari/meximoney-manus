export function isMonthlyClosingPending(statements: Array<{ periodStart: Date | string; status: string }>, periodStart: Date | string) {
  const period = new Date(periodStart);
  return !statements.some(statement => { const date = new Date(statement.periodStart); return statement.status === "closed" && date.getFullYear() === period.getFullYear() && date.getMonth() === period.getMonth(); });
}
