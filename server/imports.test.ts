import { describe, expect, it } from "vitest";
import { findPossibleDuplicates, importFingerprint } from "./imports";

describe("importación revisable", () => {
  const base = { type: "expense" as const, amountCents: 25000, currency: "mxn", occurredAt: new Date("2026-08-24T12:00:00.000Z"), accountId: 3, notes: "  Notion   mensual " };

  it("normaliza moneda, fecha y texto para una huella estable", () => {
    expect(importFingerprint(base)).toBe(importFingerprint({ ...base, currency: "MXN", notes: "notion mensual" }));
  });

  it("señala coincidencias exactas y no bloquea filas distintas", () => {
    const existing = [{ ...base, id: 11 }, { ...base, id: 12, amountCents: 25001 }];
    expect(findPossibleDuplicates(base, existing)).toEqual([11]);
  });
});
