import { describe, expect, it } from "vitest";
import { isMonthlyClosingPending } from "./monthlyClosing";

describe("alerta de cierre mensual", () => {
  it("se oculta sólo cuando hay un cierre del mismo mes", () => {
    expect(isMonthlyClosingPending([], "2026-08-01T12:00:00.000Z")).toBe(true);
    expect(isMonthlyClosingPending([{ periodStart: "2026-08-01T12:00:00.000Z", status: "draft" }], "2026-08-01T12:00:00.000Z")).toBe(true);
    expect(isMonthlyClosingPending([{ periodStart: "2026-08-01T12:00:00.000Z", status: "closed" }], "2026-08-01T12:00:00.000Z")).toBe(false);
  });
});
