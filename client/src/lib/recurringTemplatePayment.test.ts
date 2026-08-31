import { describe, expect, it } from "vitest";
import { recurringTemplatePayment } from "./recurringTemplatePayment";

describe("recurringTemplatePayment", () => {
  it("prioriza la tarjeta en un gasto y retira la cuenta", () => {
    expect(recurringTemplatePayment({ type: "expense", accountId: 12, creditCardId: 8 })).toEqual({ accountId: null, creditCardId: 8 });
  });

  it("conserva la cuenta cuando el gasto no usa tarjeta", () => {
    expect(recurringTemplatePayment({ type: "expense", accountId: 12, creditCardId: null })).toEqual({ accountId: 12, creditCardId: null });
  });

  it("no vincula tarjetas a ingresos", () => {
    expect(recurringTemplatePayment({ type: "income", accountId: 12, creditCardId: 8 })).toEqual({ accountId: 12, creditCardId: null });
  });
});
