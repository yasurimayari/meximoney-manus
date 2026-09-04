import { describe, expect, it } from "vitest";
import { dateAtNoonUtc, financialPlanTemplate, NOTION_FINANCIAL_PLAN_URL } from "./financialPlanTemplate";

describe("financialPlanTemplate", () => {
  it("preserves the original Jul-Dec 2026 period, including past months", () => {
    expect(financialPlanTemplate.startsAt).toBe("2026-07-13");
    expect(financialPlanTemplate.endsAt).toBe("2026-12-31");
    expect(financialPlanTemplate.periods.map(period => period.periodStart)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    expect(dateAtNoonUtc("2026-07").toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("contains an editable allocation cascade and income scenarios", () => {
    expect(financialPlanTemplate.notes).toContain(NOTION_FINANCIAL_PLAN_URL);
    expect(financialPlanTemplate.levels).toHaveLength(7);
    expect(financialPlanTemplate.levels[0].title).toBe("Piso vital");
    expect(financialPlanTemplate.scenarios.map(scenario => scenario.title)).toEqual(["Mes malo", "Mes base", "Mes medio", "Mes bueno"]);
    expect(financialPlanTemplate.periods.every(period => period.status === "complete" || period.status === "draft")).toBe(true);
  });
});
