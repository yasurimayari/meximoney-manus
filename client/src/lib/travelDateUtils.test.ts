import { describe, expect, it } from "vitest";
import { isDateOnlyInput, toDateOnlyInput, toDateTimeLocalInput } from "./travelDateUtils";

describe("travelDateUtils", () => {
  it("formats a trip date as a valid date input value", () => {
    expect(toDateOnlyInput("2026-09-01T18:30:00.000Z")).toBe("2026-09-01");
    expect(isDateOnlyInput("2026-09-01")).toBe(true);
    expect(isDateOnlyInput("2026-09-01T18:30")).toBe(false);
  });

  it("formats itinerary date-times with the required local input precision", () => {
    expect(toDateTimeLocalInput("2026-09-01T18:30:00.000Z")).toBe("2026-09-01T18:30");
  });
});
