import { describe, expect, it } from "vitest";
import { buildPfaePanelSummary } from "./pfaePanelSummary";

describe("resumen PFAE del Panel", () => {
  it("suma IVA manual del periodo y prioriza una fecha fiscal de calendario", () => {
    const summary = buildPfaePanelSummary({
      periodStart: new Date("2026-08-01T12:00:00Z"),
      futureTaxDueAt: new Date("2027-09-30T12:00:00Z"),
      fiscalReviews: [{ periodStart: new Date("2026-08-01T12:00:00Z"), status: "reviewed" }],
      records: [
        { periodStart: new Date("2026-08-01T12:00:00Z"), reviewStatus: "reviewed", vatCents: 16000 },
        { periodStart: new Date("2026-08-01T12:00:00Z"), reviewStatus: "pending_review", vatCents: 8000 },
        { periodStart: new Date("2026-07-01T12:00:00Z"), reviewStatus: "pending_review", vatCents: 9000 },
        { periodStart: new Date("2026-08-01T12:00:00Z"), reviewStatus: "excluded", vatCents: 7000 },
      ],
      calendarEvents: [{ eventType: "tax", status: "planned", title: "Pago provisional manual", startsAt: new Date("2027-09-10T12:00:00Z") }],
    });

    expect(summary.vatRegisteredCents).toBe(24000);
    expect(summary.pendingReviewCount).toBe(1);
    expect(summary.reviewStatus).toBe("reviewed");
    expect(summary.nextDateLabel).toBe("Pago provisional manual");
  });

  it("no inventa una fecha cuando no existe una configuración futura", () => {
    const summary = buildPfaePanelSummary({ periodStart: new Date("2026-08-01T12:00:00Z"), records: [], fiscalReviews: [], calendarEvents: [] });
    expect(summary.nextDate).toBeNull();
    expect(summary.nextDateLabel).toBeNull();
    expect(summary.reviewStatus).toBe("open");
  });
});
