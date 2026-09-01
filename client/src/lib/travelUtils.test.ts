import { describe, expect, it } from "vitest";
import { travelRemainingCents, travelSpentCents, travelStatusLabel } from "./travelUtils";

describe("travelUtils", () => {
  it("suma únicamente elementos no cancelados", () => {
    expect(travelSpentCents([
      { amountCents: 12000, status: "paid" },
      { amountCents: 3500, status: "planned" },
      { amountCents: 9000, status: "cancelled" },
    ])).toBe(15500);
  });

  it("calcula disponible sin mutar el presupuesto", () => {
    expect(travelRemainingCents(50000, 15500)).toBe(34500);
  });

  it("etiqueta estados conocidos y conserva desconocidos", () => {
    expect(travelStatusLabel("in_progress")).toBe("En curso");
    expect(travelStatusLabel("custom")).toBe("custom");
  });
});
