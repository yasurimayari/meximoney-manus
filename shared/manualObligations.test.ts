import { describe, expect, it } from "vitest";
import { buildManualFiscalAgenda } from "./manualFiscalAgenda";
import { creditCardKindLabel, debtKindLabel, normalizeLoanKind } from "./manualObligations";

describe("clasificaciones manuales de obligaciones", () => {
  it("distingue una tarjeta departamental sin modificar la lógica de tarjetas", () => {
    expect(creditCardKindLabel("departmental")).toBe("Tarjeta departamental");
    expect(creditCardKindLabel("bank_credit")).toBe("Tarjeta bancaria");
  });

  it("normaliza préstamos personales, automotrices e hipotecarios sin clasificar otras deudas", () => {
    expect(normalizeLoanKind("loan", "personal")).toBe("personal");
    expect(normalizeLoanKind("loan", "automotive")).toBe("automotive");
    expect(normalizeLoanKind("mortgage", "not_specified")).toBe("mortgage");
    expect(normalizeLoanKind("financed_purchase", "automotive")).toBe("not_specified");
    expect(debtKindLabel("loan", "automotive")).toBe("Préstamo automotriz");
    expect(debtKindLabel("mortgage", "not_specified")).toBe("Préstamo hipotecario");
  });
});

describe("agenda fiscal manual", () => {
  it("incluye sólo eventos fiscales manuales vigentes y la fecha de perfil configurada", () => {
    const items = buildManualFiscalAgenda({
      calendarEvents: [
        { id: 1, title: "IVA agosto", eventType: "tax", startsAt: new Date("2026-08-17T12:00:00Z"), recurrence: "monthly", status: "planned", amountCents: 0, currency: "MXN" },
        { id: 2, title: "Pago préstamo", eventType: "loan_payment", startsAt: new Date("2026-08-10T12:00:00Z"), recurrence: "none", status: "planned" },
        { id: 3, title: "Evento cancelado", eventType: "tax", startsAt: new Date("2026-08-20T12:00:00Z"), recurrence: "none", status: "cancelled" },
      ],
      profile: { futureTaxDueAt: new Date("2026-08-25T12:00:00Z"), futureTaxReserveCents: 1200 },
      currency: "MXN",
    }, new Date("2026-08-01T00:00:00"), new Date("2026-09-01T00:00:00"));

    expect(items.map(item => item.title)).toEqual(["IVA agosto", "Fecha fiscal configurada"]);
    expect(items[1].amountCents).toBe(1200);
  });
});
