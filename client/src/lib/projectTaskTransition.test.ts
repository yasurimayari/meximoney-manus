import { describe, expect, it } from "vitest";
import { taskStatusTransitionInput } from "./projectTaskTransition";

describe("transición de tarea desde Kanban", () => {
  it("conserva los campos de una tarea y sustituye sólo su estado", () => {
    const input = taskStatusTransitionInput({ id: 8, projectId: 2, milestoneId: 5, title: "Preparar propuesta", area: "business", scope: "business", priority: "high", dueAt: "2026-08-30T12:00:00.000Z", linkedTransactionId: 44, goalId: 3, debtId: null, requiresConfirmation: true, notes: "Revisar cifras" }, "in_progress");

    expect(input).toMatchObject({ id: 8, projectId: 2, milestoneId: 5, title: "Preparar propuesta", area: "business", scope: "business", priority: "high", status: "in_progress", linkedTransactionId: 44, goalId: 3, requiresConfirmation: true, notes: "Revisar cifras" });
    expect(input.dueAt).toBe(new Date("2026-08-30T12:00:00.000Z").getTime());
  });
});
