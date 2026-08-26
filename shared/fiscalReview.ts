type FiscalRecord = { periodStart: Date | string; reviewStatus: string };
type FiscalPeriodReview = { periodStart: Date | string; status: string };

function periodKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodDate(key: string) {
  return new Date(`${key}-01T12:00:00.000Z`);
}

function shiftPeriod(key: string, offset: number) {
  const date = periodDate(key);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return periodKey(date);
}

export function buildFiscalMonthlyComparison(records: FiscalRecord[], endingPeriod: string, months = 6) {
  return Array.from({ length: months }, (_, index) => {
    const key = shiftPeriod(endingPeriod, index - months + 1);
    const items = records.filter(record => periodKey(record.periodStart) === key);
    return {
      period: key,
      label: periodDate(key).toLocaleDateString("es-MX", { month: "short", year: "numeric", timeZone: "UTC" }),
      total: items.length,
      reviewed: items.filter(item => item.reviewStatus === "reviewed").length,
      pending: items.filter(item => item.reviewStatus === "pending_review").length,
      draft: items.filter(item => item.reviewStatus === "draft").length,
      excluded: items.filter(item => item.reviewStatus === "excluded").length,
    };
  });
}

export function getOpenFiscalReviewReminder(records: FiscalRecord[], periodReviews: FiscalPeriodReview[], referenceDate = new Date()) {
  const previous = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1, 12));
  const period = periodKey(previous);
  const matchingRecords = records.filter(record => periodKey(record.periodStart) === period);
  const review = periodReviews.find(item => periodKey(item.periodStart) === period);
  if ((!matchingRecords.length && !review) || review?.status === "reviewed") return null;
  return {
    period,
    periodLabel: previous.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }),
    relatedEntityId: previous.getUTCFullYear() * 100 + previous.getUTCMonth() + 1,
  };
}
