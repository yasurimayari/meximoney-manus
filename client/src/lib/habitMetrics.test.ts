import { describe, expect, it } from "vitest";
import { habitMetrics } from "./habitMetrics";

describe("métricas de hábitos voluntarios", () => {
  it("cuenta sólo hábitos activos con registros en la ventana semanal", () => {
    const reference = new Date("2026-09-09T12:00:00");
    const result = habitMetrics([
      { id: 1, isActive: true, checkins: [{ completedAt: "2026-09-08T12:00:00" }] },
      { id: 2, isActive: true, checkins: [{ completedAt: "2026-08-20T12:00:00" }] },
      { id: 3, isActive: false, checkins: [{ completedAt: "2026-09-09T12:00:00" }] },
    ], reference);
    expect(result).toEqual({ activeCount: 2, completedThisWeek: 1, completionRate: 50 });
  });

  it("no calcula porcentaje cuando no existen hábitos activos", () => {
    expect(habitMetrics([], new Date("2026-09-09T12:00:00"))).toEqual({ activeCount: 0, completedThisWeek: 0, completionRate: null });
  });
});
