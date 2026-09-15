import { describe, expect, it } from "vitest";
import { buildBaselineMetrics } from "./baselineMetrics";

describe("línea base privada", () => {
  it("calcula cobertura sin tratar una colección vacía como 0%", () => {
    const result = buildBaselineMetrics({
      profile: { humanReviewRequired: true, personalProfileConsent: false },
      transactions: [
        { type: "expense", accountId: 1, categoryId: 2, status: "confirmed", reviewStatus: "approved", reconciledAt: new Date() },
        { type: "income", creditCardId: null, categoryId: null, status: "needs_review", reviewStatus: "pending_review" },
      ],
    });
    expect(result.metrics.find(metric => metric.key === "payment")?.ratio).toBe(50);
    expect(result.metrics.find(metric => metric.key === "category")?.ratio).toBe(50);
    expect(result.metrics.find(metric => metric.key === "reconciliation")?.ratio).toBe(100);
    expect(buildBaselineMetrics({ transactions: [] }).metrics[0].ratio).toBeNull();
  });
});
