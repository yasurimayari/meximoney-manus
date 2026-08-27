import { describe, expect, it } from "vitest";
import { mexicoCityReferenceDate } from "./dashboardPeriod";

describe("mexicoCityReferenceDate", () => {
  it("conserva el día calendario de Ciudad de México alrededor del cambio de UTC", () => {
    expect(mexicoCityReferenceDate(new Date("2026-08-01T02:00:00.000Z"))).toBe("2026-07-31");
    expect(mexicoCityReferenceDate(new Date("2026-08-26T18:00:00.000Z"))).toBe("2026-08-26");
  });
});
