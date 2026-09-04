import { describe, expect, it } from "vitest";
import { buildCreditUtilizationHistory, creditCardUtilizationAlerts, summarizeCreditCards } from "./creditCardSummary";

describe("resumen agregado de tarjetas", () => {
  it("suma límite, crédito disponible y utilización en la moneda de reporte", () => {
    const result = summarizeCreditCards([
      { id: 1, status: "active", currency: "MXN", balanceCents: 2_000, creditLimitCents: 10_000, issuer: "Santander" },
      { id: 2, status: "active", currency: "MXN", balanceCents: 1_500, creditLimitCents: 5_000, issuer: "Klar" },
      { id: 3, status: "active", currency: "USD", balanceCents: 100, creditLimitCents: 1_000, issuer: "Klar" },
    ], "MXN");
    expect(result.payableCents).toBe(3_500);
    expect(result.availableCents).toBe(11_500);
    expect(result.limitCents).toBe(15_000);
    expect(result.utilizationPercent).toBeCloseTo(23.3333, 3);
    expect(result.utilizationBarPercent).toBeCloseTo(23.3333, 3);
    expect(result.entities).toEqual([
      { issuer: "Santander", payableCents: 2_000, availableCents: 8_000, limitCents: 10_000, countedCards: 1, usableCards: 1, utilizationPercent: 20 },
      { issuer: "Klar", payableCents: 1_500, availableCents: 3_500, limitCents: 5_000, countedCards: 1, usableCards: 1, utilizationPercent: 30 },
    ]);
  });

  it("excluye cerradas, no cuenta sobregiros como crédito disponible y limita la barra al 100%", () => {
    const result = summarizeCreditCards([
      { id: 1, status: "active", currency: "MXN", balanceCents: 12_000, creditLimitCents: 10_000, issuer: "Klar" },
      { id: 2, status: "paused", currency: "MXN", balanceCents: 1_000, creditLimitCents: 3_000, issuer: "Santander" },
      { id: 3, status: "closed", currency: "MXN", balanceCents: 500, creditLimitCents: 8_000, issuer: "Klar" },
    ], "MXN");
    expect(result.payableCents).toBe(13_000);
    expect(result.availableCents).toBe(0);
    expect(result.limitCents).toBe(13_000);
    expect(result.utilizationPercent).toBe(100);
    expect(result.utilizationBarPercent).toBe(100);
  });

  it("alerta sólo las tarjetas que superan estrictamente el 20%", () => {
    const result = creditCardUtilizationAlerts([
      { id: 1, name: "A", status: "active", currency: "MXN", balanceCents: 2_000, creditLimitCents: 10_000 },
      { id: 2, name: "B", status: "active", currency: "MXN", balanceCents: 2_100, creditLimitCents: 10_000 },
      { id: 3, name: "C", status: "closed", currency: "MXN", balanceCents: 9_000, creditLimitCents: 10_000 },
    ], "MXN");
    expect(result.map(card => [card.name, card.utilizationPercent])).toEqual([["B", 21]]);
  });

  it("reconstruye la utilización mensual a partir del saldo actual y movimientos de tarjeta", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const history = buildCreditUtilizationHistory([
      { id: 1, status: "active", currency: "MXN", balanceCents: 8_000, creditLimitCents: 10_000 },
    ], [
      { creditCardId: 1, type: "expense", amountCents: 2_000, occurredAt: new Date("2026-08-10T12:00:00.000Z") },
      { creditCardId: 1, type: "transfer_in", amountCents: 1_000, occurredAt: new Date("2026-09-05T12:00:00.000Z") },
    ], "MXN", 3, now);
    expect(history).toHaveLength(3);
    expect(history[0].usedCents).toBe(7_000);
    expect(history[1].usedCents).toBe(9_000);
    expect(history[2].usedCents).toBe(8_000);
    expect(history[2].utilizationPercent).toBe(80);
  });
});
