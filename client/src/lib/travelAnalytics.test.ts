import { describe, expect, it } from "vitest";
import { aggregateTravelExpenses, buildTravelIcs, filterTravelItems, formatTripTime, weekDays } from "./travelAnalytics";

describe("travelAnalytics", () => {
  const plans = [{ id: 1, scope: "personal" as const }, { id: 2, scope: "business" as const }];
  const items = [
    { travelPlanId: 1, categoryId: 10, status: "paid", itemType: "hotel" },
    { travelPlanId: 2, categoryId: 20, status: "planned", itemType: "flight" },
  ];

  it("filters by scope, category and status together", () => {
    expect(filterTravelItems(items, { scope: "personal", categoryId: "10", status: "paid" }, plans)).toHaveLength(1);
    expect(filterTravelItems(items, { scope: "business", categoryId: "all", status: "all" }, plans)).toHaveLength(1);
  });

  it("returns a Monday-first week", () => {
    const days = weekDays(new Date(2026, 8, 2));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
  });

  it("aggregates positive category amounts and leaves categories separate", () => {
    expect(aggregateTravelExpenses([{ amountCents: 1000, categoryId: 1 }, { amountCents: 500, categoryId: 1 }, { amountCents: 200, categoryId: null }])).toEqual({ "1": 1500, "Sin categoría": 200 });
  });

  it("creates an ICS document without cancelled events", () => {
    const ics = buildTravelIcs({ id: 4, name: "Viaje", startsAt: "2026-09-01T10:00:00Z", timeZone: "Europe/Madrid" }, [{ id: 7, title: "Vuelo", startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T12:00:00Z", status: "booked" }, { id: 8, title: "Cancelado", startsAt: "2026-09-01T13:00:00Z", status: "cancelled" }]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Viaje · Vuelo");
    expect(ics).toContain("DTSTART;TZID=Europe/Madrid:20260901T100000");
    expect(ics).toContain("DTEND;TZID=Europe/Madrid:20260901T120000");
    expect(formatTripTime("2026-09-01T10:00:00Z")).toBe("10:00");
    expect(ics).not.toContain("Cancelado");
  });
});
