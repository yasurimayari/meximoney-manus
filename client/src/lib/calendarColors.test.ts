import { describe, expect, it } from "vitest";
import { resolveCalendarColor } from "./calendarColors";

describe("resolveCalendarColor", () => {
  it("mantiene un color predeterminado semántico cuando no existe preferencia", () => {
    expect(resolveCalendarColor("credit_card_payment", [])).toBe("teal");
    expect(resolveCalendarColor("debt_due", [])).toBe("rose");
  });

  it("prioriza la preferencia privada guardada para una categoría", () => {
    expect(resolveCalendarColor("credit_card_payment", [["credit_card_payment", "violet"]])).toBe("violet");
  });
});
