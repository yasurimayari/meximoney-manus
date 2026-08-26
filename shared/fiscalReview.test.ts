import { describe, expect, it } from "vitest";
import { buildFiscalMonthlyComparison, getOpenFiscalReviewReminder } from "./fiscalReview";

describe("revisión PFAE manual", () => {
  const records = [
    { periodStart: new Date("2026-05-01T12:00:00Z"), reviewStatus: "reviewed" },
    { periodStart: new Date("2026-05-01T12:00:00Z"), reviewStatus: "pending_review" },
    { periodStart: new Date("2026-06-01T12:00:00Z"), reviewStatus: "draft" },
    { periodStart: new Date("2026-06-01T12:00:00Z"), reviewStatus: "excluded" },
  ];

  it("resume renglones por mes y estado sin inferir una decisión fiscal", () => {
    const comparison = buildFiscalMonthlyComparison(records, "2026-06", 2);
    expect(comparison).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: "2026-05", total: 2, reviewed: 1, pending: 1 }),
      expect.objectContaining({ period: "2026-06", total: 2, draft: 1, excluded: 1 }),
    ]));
  });

  it("avisa sólo si el periodo anterior tiene renglones o una rutina abierta", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    expect(getOpenFiscalReviewReminder(records, [], now)).toMatchObject({ period: "2026-06", relatedEntityId: 202606 });
    expect(getOpenFiscalReviewReminder(records, [{ periodStart: new Date("2026-06-01T12:00:00Z"), status: "reviewed" }], now)).toBeNull();
    expect(getOpenFiscalReviewReminder([], [], now)).toBeNull();
  });
});
