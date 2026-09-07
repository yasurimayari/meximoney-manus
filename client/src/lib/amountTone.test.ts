import { describe, expect, it } from "vitest";
import { amountTone, amountToneClass, displayAmountCents, signedTransactionCents } from "./amountTone";

describe("amountTone", () => {
  it("clasifica positivos, negativos y ceros", () => {
    expect(amountTone(1250)).toBe("positive");
    expect(amountTone(-1250)).toBe("negative");
    expect(amountTone(0)).toBe("neutral");
    expect(amountTone(null)).toBe("neutral");
  });

  it("expone clases coherentes para color y modo oscuro", () => {
    expect(amountToneClass(1)).toContain("emerald");
    expect(amountToneClass(-1)).toContain("rose");
    expect(amountToneClass(0)).toBe("text-foreground");
  });

  it("convierte magnitudes financieras a su signo visual semántico", () => {
    expect(displayAmountCents(1250, "income")).toBe(1250);
    expect(displayAmountCents(1250, "asset")).toBe(1250);
    expect(displayAmountCents(1250, "expense")).toBe(-1250);
    expect(displayAmountCents(1250, "liability")).toBe(-1250);
    expect(displayAmountCents(-1250, "liability")).toBe(-1250);
  });

  it("convierte el tipo del movimiento en un importe con signo", () => {
    expect(signedTransactionCents("income", 200)).toBe(200);
    expect(signedTransactionCents("expense", 200)).toBe(-200);
    expect(signedTransactionCents("transfer_out", 200)).toBe(-200);
    expect(signedTransactionCents("transfer_in", 200)).toBe(200);
  });
});

  it("pinta los gastos presupuestados en rojo sin cambiar los ingresos", () => {
    const expenseDisplay = displayAmountCents(120000, "expense");
    const incomeDisplay = displayAmountCents(120000, "income");
    expect(expenseDisplay).toBe(-120000);
    expect(amountToneClass(expenseDisplay)).toContain("rose");
    expect(incomeDisplay).toBe(120000);
    expect(amountToneClass(incomeDisplay)).toContain("emerald");
  });
