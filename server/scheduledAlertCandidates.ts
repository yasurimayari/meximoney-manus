export type ScheduledAlertCandidate = {
  type: "travel" | "payable";
  title: string;
  message: string;
  relatedEntityType: "travel_plan" | "payable";
  relatedEntityId: number;
};

const DAY_MS = 86_400_000;

function isWithinHorizon(value: Date | string | null | undefined, now: Date, reminderDays: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= now.getTime() && date.getTime() <= now.getTime() + reminderDays * DAY_MS;
}

function daysUntil(value: Date | string, now: Date) {
  const date = new Date(value);
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const current = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - current) / DAY_MS);
}

function relativeLabel(value: Date | string, now: Date) {
  const days = daysUntil(value, now);
  if (days < 0) return `venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  return `vence en ${days} días`;
}

export function upcomingTravelAlertCandidates(
  plans: Array<{ id: number; name: string; destination?: string | null; startsAt: Date | string; status: string; timeZone?: string | null }>,
  now = new Date(),
  reminderDays = 7,
): ScheduledAlertCandidate[] {
  return plans
    .filter(plan => (plan.status === "planned" || plan.status === "in_progress") && isWithinHorizon(plan.startsAt, now, reminderDays))
    .map(plan => {
      const date = new Date(plan.startsAt);
      const dateLabel = new Intl.DateTimeFormat("es-MX", {
        timeZone: plan.timeZone || "America/Mexico_City",
        day: "numeric",
        month: "long",
      }).format(date);
      return {
        type: "travel" as const,
        title: `Viaje próximo: ${plan.name}`,
        message: `${plan.destination ? `${plan.destination} · ` : ""}${dateLabel} (${relativeLabel(plan.startsAt, now)}). Revisa itinerario, documentos y presupuesto.`,
        relatedEntityType: "travel_plan" as const,
        relatedEntityId: plan.id,
      };
    });
}

export function payableAlertCandidates(
  payables: Array<{ id: number; creditor: string; dueAt?: Date | string | null; status: string; amountCents: number; currency: string }>,
  now = new Date(),
  reminderDays = 7,
): ScheduledAlertCandidate[] {
  const overdueFloor = now.getTime() - 30 * DAY_MS;
  return payables
    .filter(payable => {
      if (!payable.dueAt || !["pending", "overdue"].includes(payable.status)) return false;
      const dueAt = new Date(payable.dueAt).getTime();
      return dueAt >= overdueFloor && dueAt <= now.getTime() + reminderDays * DAY_MS;
    })
    .map(payable => ({
      type: "payable" as const,
      title: `${new Date(payable.dueAt!).getTime() < now.getTime() ? "Pago vencido" : "Pago próximo"}: ${payable.creditor}`,
      message: `${relativeLabel(payable.dueAt!, now)}. Importe registrado: ${new Intl.NumberFormat("es-MX", { style: "currency", currency: payable.currency }).format(payable.amountCents / 100)}. Confirma manualmente el pago; Meximoney no lo ejecuta.`,
      relatedEntityType: "payable" as const,
      relatedEntityId: payable.id,
    }));
}
