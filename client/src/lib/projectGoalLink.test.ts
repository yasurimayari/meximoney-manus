import { describe, expect, it } from "vitest";
import { goalForProject, goalsEligibleForProject } from "./projectGoalLink";

const goals = [
  { id: 1, name: "Fondo de emergencia", projectId: 9, entityId: null, status: "active" },
  { id: 2, name: "Equipo YMC", projectId: null, entityId: 4, status: "active" },
  { id: 3, name: "Objetivo cancelado", projectId: null, entityId: null, status: "cancelled" },
];

describe("projectGoalLink", () => {
  it("localiza el objetivo asociado a un proyecto sin crear una relación paralela", () => {
    expect(goalForProject(goals, 9)).toMatchObject({ id: 1, name: "Fondo de emergencia" });
    expect(goalForProject(goals, 10)).toBeNull();
  });

  it("sólo ofrece objetivos de la misma entidad y conserva la selección actual", () => {
    expect(goalsEligibleForProject(goals, null).map(goal => goal.id)).toEqual([1]);
    expect(goalsEligibleForProject(goals, 4).map(goal => goal.id)).toEqual([2]);
    expect(goalsEligibleForProject(goals, null, 3).map(goal => goal.id)).toEqual([1, 3]);
  });
});
