import { describe, expect, it } from "vitest";
import { buildProjectMonth, buildProjectWeek, calendarDateKey, shiftProjectCalendar, startOfMonday } from "./projectCalendarGrid";

describe("projectCalendarGrid", () => {
  it("inicia la semana en lunes y entrega siete días consecutivos", () => {
    const week = buildProjectWeek(new Date(2026, 7, 26));
    expect(week).toHaveLength(7);
    expect(week[0]?.getDay()).toBe(1);
    expect(calendarDateKey(week[0]!)).toBe("2026-08-24");
    expect(calendarDateKey(week[6]!)).toBe("2026-08-30");
  });

  it("incluye semanas completas de lunes a domingo para el mes", () => {
    const days = buildProjectMonth(new Date(2026, 7, 15));
    expect(days[0]?.getDay()).toBe(1);
    expect(days.at(-1)?.getDay()).toBe(0);
    expect(days.some(day => calendarDateKey(day) === "2026-08-01")).toBe(true);
    expect(days.some(day => calendarDateKey(day) === "2026-08-31")).toBe(true);
  });

  it("avanza el calendario por semana o por mes", () => {
    expect(calendarDateKey(shiftProjectCalendar(new Date(2026, 7, 26), "week", 1))).toBe("2026-09-02");
    expect(calendarDateKey(shiftProjectCalendar(new Date(2026, 7, 26), "month", 1))).toBe("2026-09-26");
    expect(startOfMonday(new Date(2026, 7, 30)).getDay()).toBe(1);
  });
});
