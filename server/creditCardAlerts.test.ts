import { describe, expect, it } from "vitest";
import { creditCardAlertCandidates, nextMonthlyOccurrence } from "./creditCardAlerts";

describe("alertas de tarjetas", () => {
  it("ajusta fechas de 31 al último día disponible del mes", () => {
    expect(nextMonthlyOccurrence(31, new Date("2026-04-01T12:00:00"))).toEqual(new Date(2026, 3, 30));
  });

  it("genera avisos de pago, corte y sobregiro sin crear movimientos", () => {
    const candidates = creditCardAlertCandidates([{ id: 9, name: "Tarjeta prueba", currency: "MXN", creditLimitCents: 1_000_00, balanceCents: 1_250_00, statementClosingDay: 14, paymentDueDay: 16, status: "active" }], new Date("2026-08-10T12:00:00"));

    expect(candidates.map(candidate => candidate.type)).toEqual(expect.arrayContaining(["credit_card_overlimit", "credit_card_cutoff", "credit_card_payment"]));
    expect(candidates.every(candidate => candidate.relatedEntityType === "credit_card" && candidate.relatedEntityId === 9)).toBe(true);
  });
});
