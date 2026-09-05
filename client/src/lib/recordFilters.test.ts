import { describe, expect, it } from "vitest";
import { filterRecords } from "./recordFilters";

describe("filterRecords", () => {
  const records = [
    { id: 1, occurredAt: "2026-08-01T12:00:00.000Z", type: "expense" },
    { id: 2, occurredAt: "2026-08-15T12:00:00.000Z", type: "income" },
    { id: 3, occurredAt: "2026-09-01T12:00:00.000Z", type: "expense" },
  ];

  it("applies an inclusive date range", () => {
    expect(filterRecords(records, { startDate: "2026-08-01", endDate: "2026-08-31" }).map(record => record.id)).toEqual([1, 2]);
  });

  it("filters by movement type and leaves all types when empty", () => {
    expect(filterRecords(records, { type: "expense" }).map(record => record.id)).toEqual([1, 3]);
    expect(filterRecords(records, {}).length).toBe(3);
  });

  it("separa movimientos conciliados de los pendientes", () => {
    const withReconciliation = records.map((record, index) => ({ ...record, reconciledAt: index === 0 ? "2026-09-06T12:00:00.000Z" : null }));
    expect(filterRecords(withReconciliation, { reconciliation: "reconciled" }).map(record => record.id)).toEqual([1]);
    expect(filterRecords(withReconciliation, { reconciliation: "unreconciled" }).map(record => record.id)).toEqual([2, 3]);
  });
});
