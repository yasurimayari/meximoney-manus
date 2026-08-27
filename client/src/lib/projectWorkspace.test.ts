import { describe, expect, it } from "vitest";
import { buildProjectWorkspaceOverview, projectFocusQueue } from "./projectWorkspace";

describe("espacio operativo de Proyectos", () => {
  it("resume proyectos activos y conserva las tareas archivadas como cerradas", () => {
    const overview = buildProjectWorkspaceOverview([{ id: 1, status: "active" }, { id: 2, status: "archived" }], [
      { id: 1, projectId: 1, title: "Pendiente", status: "pending", priority: "medium" },
      { id: 2, projectId: 1, title: "Archivada", status: "pending", priority: "high", archivedAt: "2026-08-01" },
    ]);

    expect(overview).toMatchObject({ activeProjects: 1, openTasks: 1, closedTasks: 1, totalTasks: 2, percent: 50 });
  });

  it("prioriza tareas abiertas con fecha más próxima y luego prioridad", () => {
    const queue = projectFocusQueue([
      { id: 1, title: "Sin fecha", status: "pending", priority: "critical" },
      { id: 2, title: "Viernes", status: "pending", priority: "low", dueAt: "2026-08-28" },
      { id: 3, title: "Mañana", status: "waiting", priority: "medium", dueAt: "2026-08-27" },
      { id: 4, title: "Completada", status: "completed", priority: "critical" },
    ], 5, "all", "urgency", new Date("2026-08-26T12:00:00"));

    expect(queue.map(task => task.id)).toEqual([3, 2, 1]);
  });

  it("filtra urgentes y permite ordenar la cola por prioridad", () => {
    const tasks = [
      { id: 1, title: "Atrasada", status: "pending", priority: "low", dueAt: "2026-08-25" },
      { id: 2, title: "Hoy", status: "pending", priority: "high", dueAt: "2026-08-26" },
      { id: 3, title: "Esta semana", status: "pending", priority: "critical", dueAt: "2026-08-30" },
    ];
    const date = new Date("2026-08-26T12:00:00");

    expect(projectFocusQueue(tasks, 5, "urgent", "urgency", date).map(task => task.id)).toEqual([1, 2]);
    expect(projectFocusQueue(tasks, 5, "all", "priority", date).map(task => task.id)).toEqual([3, 2, 1]);
  });
});
