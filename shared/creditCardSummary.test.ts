import { describe, expect, it } from "vitest";
import { summarizeCreditCards } from "./creditCardSummary";

describe("resumen agregado de tarjetas", () => {
  it("suma límite, crédito disponible y utilización en la moneda de reporte", () => {
    const result = summarizeCreditCards([
      { status: "active", currency: "MXN", balanceCents: 2_000, creditLimitCents: 10_000, issuer: "Santander" },
      { status: "active", currency: "MXN", balanceCents: 1_500, creditLimitCents: 5_000, issuer: "Klar" },
      { status: "active", currency: "USD", balanceCents: 100, creditLimitCents: 1_000, issuer: "Klar" },
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
      { status: "active", currency: "MXN", balanceCents: 12_000, creditLimitCents: 10_000, issuer: "Klar" },
      { status: "paused", currency: "MXN", balanceCents: 1_000, creditLimitCents: 3_000, issuer: "Santander" },
      { status: "closed", currency: "MXN", balanceCents: 500, creditLimitCents: 8_000, issuer: "Klar" },
    ], "MXN");
    expect(result.payableCents).toBe(13_000);
    expect(result.availableCents).toBe(0);
    expect(result.limitCents).toBe(13_000);
    expect(result.utilizationPercent).toBe(100);
    expect(result.utilizationBarPercent).toBe(100);
  });
});
