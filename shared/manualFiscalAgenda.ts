export type ManualFiscalAgendaItem = {
  id: string;
  date: Date;
  title: string;
  note: string;
  amountCents: number | null;
  currency: string;
  source: "calendar_event" | "profile";
  calendarEventId?: number;
};

function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }

function eventOccursInMonth(event: any, year: number, month: number) {
  const base = new Date(event.startsAt);
  if (base.getTime() > new Date(year, month + 1, 0, 23, 59, 59).getTime()) return null;
  if (event.recurrence === "none") return base.getFullYear() === year && base.getMonth() === month ? startOfDay(base) : null;
  if (event.recurrence === "monthly") return new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate()));
  if (event.recurrence === "quarterly") {
    const offset = (year - base.getFullYear()) * 12 + month - base.getMonth();
    return offset >= 0 && offset % 3 === 0 ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
  }
  return base.getMonth() === month ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
}

export function buildManualFiscalAgenda(data: { calendarEvents: any[]; profile?: any; currency: string }, start: Date, endExclusive: Date): ManualFiscalAgendaItem[] {
  const items: ManualFiscalAgendaItem[] = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor < endExclusive; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    data.calendarEvents.filter(event => event.eventType === "tax" && event.status !== "cancelled").forEach(event => {
      const occurrence = eventOccursInMonth(event, cursor.getFullYear(), cursor.getMonth());
      if (occurrence && occurrence >= start && occurrence < endExclusive) items.push({ id: `tax-${event.id}-${cursor.getFullYear()}-${cursor.getMonth()}`, date: occurrence, title: event.title, note: event.recurrence === "none" ? "Fecha fiscal manual" : `Recurrente manual: ${event.recurrence}`, amountCents: event.amountCents ?? null, currency: event.currency || data.currency, source: "calendar_event", calendarEventId: event.id });
    });
  }
  if (data.profile?.futureTaxDueAt) {
    const date = startOfDay(new Date(data.profile.futureTaxDueAt));
    if (date >= start && date < endExclusive) items.push({ id: "profile-future-tax", date, title: "Fecha fiscal configurada", note: "Fecha ingresada en el perfil; no proviene del SAT.", amountCents: data.profile.futureTaxReserveCents ?? null, currency: data.currency, source: "profile" });
  }
  return items.sort((left, right) => left.date.getTime() - right.date.getTime() || left.title.localeCompare(right.title));
}
