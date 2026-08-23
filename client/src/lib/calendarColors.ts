export type CalendarColorCategory = "tax" | "credit_card_cutoff" | "credit_card_payment" | "loan_payment" | "document_expiry" | "insurance_renewal" | "review" | "other" | "debt_due" | "document_due" | "task_due" | "fiscal_reserve";
export type CalendarColorKey = "teal" | "emerald" | "sky" | "indigo" | "violet" | "amber" | "orange" | "rose" | "slate";

export const calendarColorCategories: Array<{ key: CalendarColorCategory; label: string }> = [
  { key: "credit_card_payment", label: "Pago de tarjeta" }, { key: "credit_card_cutoff", label: "Corte de tarjeta" }, { key: "loan_payment", label: "Pago de préstamo" }, { key: "debt_due", label: "Vencimiento de deuda" },
  { key: "tax", label: "Fecha fiscal" }, { key: "fiscal_reserve", label: "Reserva fiscal" }, { key: "document_expiry", label: "Vencimiento documental" }, { key: "document_due", label: "Recordatorio documental" },
  { key: "insurance_renewal", label: "Renovación de seguro" }, { key: "task_due", label: "Tarea financiera" }, { key: "review", label: "Revisión" }, { key: "other", label: "Otro evento" },
];

export const calendarColors: Array<{ key: CalendarColorKey; label: string }> = [
  { key: "teal", label: "Verde azulado" }, { key: "emerald", label: "Esmeralda" }, { key: "sky", label: "Azul cielo" }, { key: "indigo", label: "Índigo" }, { key: "violet", label: "Violeta" }, { key: "amber", label: "Ámbar" }, { key: "orange", label: "Naranja" }, { key: "rose", label: "Rosa" }, { key: "slate", label: "Pizarra" },
];

export const defaultCalendarColors: Record<CalendarColorCategory, CalendarColorKey> = { tax: "amber", credit_card_cutoff: "indigo", credit_card_payment: "teal", loan_payment: "violet", document_expiry: "sky", insurance_renewal: "emerald", review: "slate", other: "teal", debt_due: "rose", document_due: "indigo", task_due: "sky", fiscal_reserve: "amber" };

export function resolveCalendarColor(category: CalendarColorCategory, preferences: Iterable<[CalendarColorCategory, CalendarColorKey]>) {
  return new Map(preferences).get(category) ?? defaultCalendarColors[category];
}
