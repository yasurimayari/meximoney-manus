import { describe, expect, it } from "vitest";
import { amountTone, amountToneClass, signedTransactionCents } from "./amountTone";

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

  it("convierte el tipo del movimiento en un importe con signo", () => {
    expect(signedTransactionCents("income", 200)).toBe(200);
    expect(signedTransactionCents("expense", 200)).toBe(-200);
    expect(signedTransactionCents("transfer_out", 200)).toBe(-200);
    expect(signedTransactionCents("transfer_in", 200)).toBe(200);
  });
});
