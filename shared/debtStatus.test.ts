import { describe, expect, it } from "vitest";
import { summarizeDebtStatus } from "./debtStatus";

describe("resumen del estado de deuda", () => {
  it("separa principal, pagos e intereses por atraso", () => {
    const summary = summarizeDebtStatus(
      { originalAmountCents: 1_000_000, balanceCents: 1_170_700, nextDueAt: new Date("2026-08-01T12:00:00Z") },
      [{ principalCents: 0, interestCents: 0, lateInterestCents: 0, feeCents: 0 }],
      [{ type: "late_interest", amountCents: 170_700 }],
      new Date("2026-09-03T12:00:00Z").getTime(),
    );

    expect(summary.originalAmountCents).toBe(1_000_000);
    expect(summary.lateInterestAccruedCents).toBe(170_700);
    expect(summary.untrackedIncreaseCents).toBe(0);
    expect(summary.overdue).toBe(true);
  });

  it("señala una diferencia no documentada sin alterar el saldo", () => {
    const summary = summarizeDebtStatus(
      { originalAmountCents: 1_000_000, balanceCents: 1_170_700, nextDueAt: null },
      [],
      [],
    );
    expect(summary.untrackedIncreaseCents).toBe(170_700);
    expect(summary.overdue).toBe(false);
  });
});
