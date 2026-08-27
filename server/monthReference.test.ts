import { describe, expect, it } from "vitest";
import { displayPeriodStart, mexicoCityReferenceMonth } from "./monthReference";

describe("referencia mensual de Ciudad de México", () => {
  it("acepta la fecha local enviada por la sesión para evitar un mes de servidor desfasado", () => {
    expect(mexicoCityReferenceMonth("2026-08-26").toISOString()).toBe("2026-08-26T12:00:00.000Z");
  });

  it("descarta una referencia inválida y conserva una fecha de respaldo", () => {
    const fallback = new Date("2026-08-27T00:00:00.000Z");
    expect(mexicoCityReferenceMonth("2026-99-99", fallback)).toBe(fallback);
  });
});

describe("inicio de periodo para representación local", () => {
  it("mantiene agosto al preparar el periodo mensual para Ciudad de México", () => {
    expect(displayPeriodStart(new Date("2026-08-26T12:00:00.000Z"))).toEqual(new Date("2026-08-01T12:00:00.000Z"));
  });
});
