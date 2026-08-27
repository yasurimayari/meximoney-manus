import { describe, expect, it } from "vitest";
import { buildProjectTimelineItems, projectsWithoutTimelineDate } from "./projectTimeline";

describe("calendario de proyectos", () => {
  it("reúne el mismo proyecto, sus partes y tareas fechadas conservando el color del proyecto", () => {
    const projects = [{ id: 1, name: "Fondo de emergencia", color: "#0f766e", startsAt: "2026-08-01", targetAt: null }];
    const items = buildProjectTimelineItems(projects, [{ id: 10, projectId: 1, title: "Definir aportación", targetAt: "2026-08-10" }], [{ id: 20, projectId: 1, title: "Registrar ahorro", status: "pending", dueAt: "2026-08-15" }]);

    expect(items.map(item => [item.source, item.project.name, item.project.color])).toEqual([
      ["project_start", "Fondo de emergencia", "#0f766e"],
      ["milestone", "Fondo de emergencia", "#0f766e"],
      ["task", "Fondo de emergencia", "#0f766e"],
    ]);
  });

  it("mantiene visibles en el calendario los proyectos creados sin fechas mediante una sección de planificación", () => {
    const projects = [{ id: 1, name: "Proyecto fechado", color: "#0f766e", startsAt: "2026-08-01" }, { id: 2, name: "Proyecto sin fechas", color: "#b45309", startsAt: null }];
    const items = buildProjectTimelineItems(projects, [], []);

    expect(projectsWithoutTimelineDate(projects, items).map(project => project.id)).toEqual([2]);
  });
});
