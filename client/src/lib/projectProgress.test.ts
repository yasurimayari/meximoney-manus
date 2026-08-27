import { describe, expect, it } from "vitest";
import { projectProgress } from "./projectProgress";

describe("progreso de proyectos", () => {
  it("cuenta como cerradas las tareas completadas o archivadas y excluye canceladas", () => {
    expect(projectProgress([{ status: "completed" }, { status: "pending", archivedAt: new Date() }, { status: "pending" }, { status: "cancelled" }])).toEqual({ total: 3, completed: 2, percent: 67 });
  });

  it("mantiene el progreso en cero cuando aún no existen tareas", () => {
    expect(projectProgress([])).toEqual({ total: 0, completed: 0, percent: 0 });
  });
});
