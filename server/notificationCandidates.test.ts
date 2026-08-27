import { describe, expect, it } from "vitest";
import { buildNotificationCandidates } from "./routers";

const preferences = {
  inAppEnabled: true,
  calendarEnabled: true,
  documentsEnabled: true,
  debtsEnabled: true,
  reviewsEnabled: true,
  budgetEnabled: true,
  taxReserveEnabled: true,
  telegramEnabled: false,
  telegramScheduleCronTaskUid: null,
  telegramLastDigestDate: null,
};

describe("candidatos de notificaciones", () => {
  it("detecta avisos sólo cuando la actualización explícita evalúa datos manuales vigentes", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const candidates = buildNotificationCandidates({
      calendarEvents: [{ id: 1, title: "Fecha fiscal manual", status: "planned", startsAt: new Date("2026-08-30T12:00:00.000Z") }],
      documents: [{ id: 2, name: "Póliza", expiresAt: new Date("2026-09-01T12:00:00.000Z") }],
      debts: [{ id: 3, name: "Préstamo personal", status: "active", nextDueAt: new Date("2026-09-02T12:00:00.000Z") }],
      creditCards: [],
      budgets: [{ id: 4, periodStart: new Date("2026-08-01T12:00:00.000Z") }],
      profile: null,
      transactions: [],
      workspaceAccess: { role: "owner" },
      fiscalRecords: [],
      fiscalPeriodReviews: [],
    }, preferences, now);

    expect(candidates.map(candidate => candidate.type)).toEqual(["calendar", "document", "debt", "budget"]);
    expect(candidates.every(candidate => candidate.relatedEntityId > 0)).toBe(true);
  });

  it("no produce candidatos cuando la bandeja interna está desactivada", () => {
    expect(buildNotificationCandidates({ calendarEvents: [{ id: 1, title: "Evento", status: "planned", startsAt: new Date() }] }, { ...preferences, inAppEnabled: false })).toEqual([]);
  });
});
