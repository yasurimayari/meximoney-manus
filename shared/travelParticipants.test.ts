import { describe, expect, it } from "vitest";
import { normalizeParticipantIds, participantContactTypeLabel } from "./travelParticipants";

describe("travelParticipants", () => {
  it("deduplicates and ignores invalid participant ids", () => {
    expect(normalizeParticipantIds([4, 4, 9, 0, -2, 2.5])).toEqual([4, 9]);
  });

  it("preserves undefined when the caller does not want to change relationships", () => {
    expect(normalizeParticipantIds(undefined)).toBeUndefined();
  });

  it("translates common contact types for the travel UI", () => {
    expect(participantContactTypeLabel("family")).toBe("Familia");
    expect(participantContactTypeLabel("team")).toBe("Equipo");
    expect(participantContactTypeLabel("custom")).toBe("custom");
    expect(participantContactTypeLabel(null)).toBe("Contacto");
  });
});
