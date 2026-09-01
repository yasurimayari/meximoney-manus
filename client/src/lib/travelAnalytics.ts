export type TravelScope = "personal" | "business" | "mixed";

export type TravelFilterItem = {
  categoryId?: number | null;
  status: string;
  itemType: string;
  travelPlanId: number;
};

export function filterTravelItems<T extends TravelFilterItem>(items: T[], filters: { categoryId: string; status: string; scope: string }, plans: Array<{ id: number; scope: TravelScope }>) {
  const allowedPlanIds = new Set(plans.filter(plan => filters.scope === "all" || plan.scope === filters.scope).map(plan => plan.id));
  return items.filter(item => allowedPlanIds.has(item.travelPlanId)
    && (filters.categoryId === "all" || String(item.categoryId ?? "none") === filters.categoryId)
    && (filters.status === "all" || item.status === filters.status));
}

export function weekDays(anchor: Date) {
  const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return day;
  });
}

export function aggregateTravelExpenses(items: Array<{ amountCents: number; categoryId?: number | null }>) {
  return items.reduce<Record<string, number>>((result, item) => {
    const key = item.categoryId == null ? "Sin categoría" : String(item.categoryId);
    result[key] = (result[key] ?? 0) + Math.max(0, item.amountCents);
    return result;
  }, {});
}

export function formatTripTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatIcsDate(value: Date | string | null | undefined, timeZone?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (timeZone) return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}`;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function buildTravelIcs(plan: { id: number; name: string; origin?: string | null; destination?: string | null; startsAt: Date | string; endsAt?: Date | string | null; timeZone?: string | null }, items: Array<{ id: number; title: string; startsAt?: Date | string | null; endsAt?: Date | string | null; location?: string | null; notes?: string | null; status: string }>) {
  const events = items.filter(item => item.status !== "cancelled").flatMap(item => {
    const start = formatIcsDate(item.startsAt ?? plan.startsAt, plan.timeZone ?? "America/Mexico_City");
    const end = formatIcsDate(item.endsAt ?? item.startsAt ?? plan.endsAt ?? plan.startsAt, plan.timeZone ?? "America/Mexico_City");
    if (!start || !end) return [];
    return [`BEGIN:VEVENT\nUID:meximoney-travel-${plan.id}-${item.id}@meximoney\nDTSTAMP:${formatIcsDate(new Date())}\nDTSTART;TZID=${escapeIcs(plan.timeZone ?? "America/Mexico_City")}:${start}\nDTEND;TZID=${escapeIcs(plan.timeZone ?? "America/Mexico_City")}:${end}\nSUMMARY:${escapeIcs(`${plan.name} · ${item.title}`)}\nLOCATION:${escapeIcs(item.location ?? `${plan.origin ?? ""} → ${plan.destination ?? ""}`)}\nDESCRIPTION:${escapeIcs(item.notes ?? "")}\nEND:VEVENT`];
  });
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Meximoney//Viajes//ES\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n${events.join("\n")}\nEND:VCALENDAR\n`;
}
