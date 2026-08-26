type FiscalRecord = { periodStart: Date | string; reviewStatus: string; vatCents: number; entityId?: number | null; projectId?: number | null; currency?: string };
type FiscalReview = { periodStart: Date | string; status: string };
type CalendarEvent = { eventType: string; status: string; startsAt: Date | string; title: string };

function periodKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 7);
}

export function buildPfaePanelSummary({ records, fiscalReviews, calendarEvents, periodStart, futureTaxDueAt }: { records: FiscalRecord[]; fiscalReviews: FiscalReview[]; calendarEvents: CalendarEvent[]; periodStart: Date | string; futureTaxDueAt?: Date | string | null }) {
  const period = periodKey(periodStart);
  const activeRecords = records.filter(record => periodKey(record.periodStart) === period && record.reviewStatus !== "excluded");
  const review = fiscalReviews.find(item => periodKey(item.periodStart) === period);
  const now = new Date();
  const nextCalendarDate = calendarEvents
    .filter(event => event.eventType === "tax" && event.status === "planned" && new Date(event.startsAt).getTime() >= now.getTime())
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const manualProfileDate = futureTaxDueAt && new Date(futureTaxDueAt).getTime() >= now.getTime() ? new Date(futureTaxDueAt) : null;
  const nextDate = nextCalendarDate ? new Date(nextCalendarDate.startsAt) : manualProfileDate;
  return {
    period,
    vatRegisteredCents: activeRecords.reduce((total, record) => total + record.vatCents, 0),
    pendingReviewCount: activeRecords.filter(record => record.reviewStatus !== "reviewed").length,
    recordCount: activeRecords.length,
    reviewStatus: review?.status === "reviewed" ? "reviewed" : "open",
    nextDate,
    nextDateLabel: nextCalendarDate?.title || (manualProfileDate ? "Fecha fiscal configurada" : null),
  };
}
