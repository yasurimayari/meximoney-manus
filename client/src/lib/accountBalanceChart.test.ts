import { describe, expect, it } from "vitest";
import { buildAccountBalanceChart } from "./accountBalanceChart";

describe("comparativo de saldos de Cuentas", () => {
  it("separa por moneda el saldo positivo, descubierto y obligación pendiente", () => {
    expect(buildAccountBalanceChart([
      { currency: "MXN", currentBalanceCents: 125000 },
      { currency: "MXN", currentBalanceCents: -8000 },
      { currency: "USD", currentBalanceCents: 40000 },
    ], [
      { currency: "MXN", balanceCents: 73000 },
      { currency: "USD", balanceCents: -5000 },
    ])).toEqual([
      { currency: "MXN", positiveCents: 125000, negativeCents: 81000 },
      { currency: "USD", positiveCents: 45000, negativeCents: 0 },
    ]);
  });

  it("trata un saldo negativo de tarjeta como saldo a favor y no como obligación", () => {
    expect(buildAccountBalanceChart([], [{ currency: "MXN", balanceCents: -1326181 }])).toEqual([
      { currency: "MXN", positiveCents: 1326181, negativeCents: 0 },
    ]);
  });
});
