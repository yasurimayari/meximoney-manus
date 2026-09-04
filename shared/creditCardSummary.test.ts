import { describe, expect, it } from "vitest";
import { summarizeCreditCards } from "./creditCardSummary";

describe("resumen agregado de tarjetas", () => {
  it("suma límite y crédito disponible sólo de la moneda de reporte", () => {
    const result = summarizeCreditCards([
      { status: "active", currency: "MXN", balanceCents: 2_000, creditLimitCents: 10_000 },
      { status: "active", currency: "MXN", balanceCents: 1_500, creditLimitCents: 5_000 },
      { status: "active", currency: "USD", balanceCents: 100, creditLimitCents: 1_000 },
    ], "MXN");
    expect(result.payableCents).toBe(3_500);
    expect(result.availableCents).toBe(11_500);
    expect(result.limitCents).toBe(15_000);
  });

  it("excluye cerradas, no cuenta sobregiros como crédito disponible y conserva límite total", () => {
    const result = summarizeCreditCards([
      { status: "active", currency: "MXN", balanceCents: 12_000, creditLimitCents: 10_000 },
      { status: "paused", currency: "MXN", balanceCents: 1_000, creditLimitCents: 3_000 },
      { status: "closed", currency: "MXN", balanceCents: 500, creditLimitCents: 8_000 },
    ], "MXN");
    expect(result.payableCents).toBe(13_000);
    expect(result.availableCents).toBe(0);
    expect(result.limitCents).toBe(13_000);
  });
});
