import { describe, expect, it } from "vitest";
import { payableAlertCandidates, upcomingTravelAlertCandidates } from "./scheduledAlertCandidates";

describe("scheduled alert candidates", () => {
  const now = new Date("2026-09-01T12:00:00Z");

  it("includes upcoming active trips within the configured horizon", () => {
    const alerts = upcomingTravelAlertCandidates([
      { id: 1, name: "Madrid", destination: "Madrid", startsAt: "2026-09-05T10:00:00Z", status: "planned", timeZone: "Europe/Madrid" },
      { id: 2, name: "Cancelado", startsAt: "2026-09-03T10:00:00Z", status: "cancelled" },
      { id: 3, name: "Lejano", startsAt: "2026-09-20T10:00:00Z", status: "planned" },
    ], now, 7);
    expect(alerts.map(alert => alert.relatedEntityId)).toEqual([1]);
    expect(alerts[0]?.type).toBe("travel");
  });

  it("includes upcoming and recently overdue unpaid obligations", () => {
    const alerts = payableAlertCandidates([
      { id: 1, creditor: "Proveedor", dueAt: "2026-09-04T12:00:00Z", status: "pending", amountCents: 250000, currency: "MXN" },
      { id: 2, creditor: "Atrasado", dueAt: "2026-08-28T12:00:00Z", status: "overdue", amountCents: 50000, currency: "MXN" },
      { id: 3, creditor: "Pagado", dueAt: "2026-09-02T12:00:00Z", status: "paid", amountCents: 10000, currency: "MXN" },
    ], now, 7);
    expect(alerts.map(alert => alert.relatedEntityId)).toEqual([1, 2]);
    expect(alerts[1]?.title).toContain("vencido");
  });
});
