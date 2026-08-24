import { describe, expect, it } from "vitest";
import { comparableInvestmentValueCents, investmentNeedsManualConversion } from "./investmentData";

const activeUsd = { currency: "USD", currentValueCents: 100_00, reportCurrency: null, reportValueCents: null, includeInNetWorth: true, status: "active" as const };

describe("patrimonio de inversiones manuales", () => {
  it("usa el valor directo o la conversión explícita, nunca un precio inventado", () => {
    expect(comparableInvestmentValueCents({ ...activeUsd, currency: "MXN", currentValueCents: 25_000_00 }, "MXN")).toBe(25_000_00);
    expect(comparableInvestmentValueCents({ ...activeUsd, reportCurrency: "MXN", reportValueCents: 1_800_00 }, "MXN")).toBe(1_800_00);
    expect(comparableInvestmentValueCents(activeUsd, "MXN")).toBeNull();
  });

  it("marca como pendiente sólo una posición activa e incluida sin conversión manual", () => {
    expect(investmentNeedsManualConversion(activeUsd, "MXN")).toBe(true);
    expect(investmentNeedsManualConversion({ ...activeUsd, includeInNetWorth: false }, "MXN")).toBe(false);
    expect(investmentNeedsManualConversion({ ...activeUsd, status: "closed" }, "MXN")).toBe(false);
  });
});
