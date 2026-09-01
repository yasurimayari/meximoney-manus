import { describe, expect, it } from "vitest";
import { combineDateAndOptionalTime, isDateOnlyInput, toDateOnlyInput, toDateTimeLocalInput, toTimeInput } from "./travelDateUtils";

describe("travelDateUtils", () => {
  it("formats a trip date as a valid date input value", () => {
    expect(toDateOnlyInput("2026-09-01T18:30:00.000Z")).toBe("2026-09-01");
    expect(isDateOnlyInput("2026-09-01")).toBe(true);
    expect(isDateOnlyInput("2026-09-01T18:30")).toBe(false);
  });

  it("formats itinerary date-times with the required local input precision", () => {
    expect(toDateTimeLocalInput("2026-09-01T18:30:00.000Z")).toBe("2026-09-01T18:30");
  });

  it("combines optional times without creating partial values", () => {
    expect(combineDateAndOptionalTime("2026-10-24", "08:30")).toBe("2026-10-24T08:30");
    expect(combineDateAndOptionalTime("2026-10-24", undefined)).toBe("2026-10-24");
    expect(toTimeInput("2026-10-24T08:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });
});
