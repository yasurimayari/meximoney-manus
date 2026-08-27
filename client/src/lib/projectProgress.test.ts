import { describe, expect, it } from "vitest";
import { projectProgress, projectTasksForProgress, projectTasksForView } from "./projectProgress";

describe("progreso de proyectos", () => {
  it("cuenta como cerradas las tareas completadas o archivadas y excluye canceladas", () => {
    expect(projectProgress([{ status: "completed" }, { status: "pending", archivedAt: new Date() }, { status: "pending" }, { status: "cancelled" }])).toEqual({ total: 3, completed: 2, percent: 67 });
  });

  it("mantiene el progreso en cero cuando aún no existen tareas", () => {
    expect(projectProgress([])).toEqual({ total: 0, completed: 0, percent: 0 });
  });

  it("cuenta una archivada en el avance aunque la vista activa la mantenga oculta", () => {
    const tasks = [{ id: 1, status: "completed" }, { id: 2, status: "pending", archivedAt: new Date("2026-08-27T12:00:00Z") }, { id: 3, status: "pending" }];

    expect(projectTasksForView(tasks, false).map(task => task.id)).toEqual([1, 3]);
    expect(projectProgress(projectTasksForProgress(tasks))).toEqual({ total: 3, completed: 2, percent: 67 });
  });
});
