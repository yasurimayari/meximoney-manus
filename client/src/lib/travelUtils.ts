export type TravelItemStatus = "planned" | "booked" | "paid" | "completed" | "cancelled";

export function travelSpentCents(items: Array<{ amountCents: number; status: TravelItemStatus }>) {
  return items.filter(item => item.status !== "cancelled").reduce((total, item) => total + item.amountCents, 0);
}

export function travelRemainingCents(budgetCents: number, spentCents: number) {
  return budgetCents - spentCents;
}

export function travelStatusLabel(status: string) {
  return { planned: "Planeado", in_progress: "En curso", completed: "Completado", cancelled: "Cancelado", archived: "Archivado", booked: "Reservado", paid: "Pagado" }[status] ?? status;
}
