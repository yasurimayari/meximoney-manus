export type KanbanTaskStatus = "pending" | "in_progress" | "waiting" | "completed";

export type TaskForStatusTransition = {
  id: number;
  projectId?: number | null;
  milestoneId?: number | null;
  title: string;
  area: "budget" | "debt" | "savings" | "investment" | "tax" | "documents" | "business" | "review" | "other";
  scope?: "personal" | "business" | "mixed";
  priority: "critical" | "high" | "medium" | "low";
  dueAt?: Date | string | null;
  goalId?: number | null;
  debtId?: number | null;
  requiresConfirmation?: boolean;
  notes?: string | null;
};

export function taskStatusTransitionInput(task: TaskForStatusTransition, status: KanbanTaskStatus) {
  return {
    id: task.id,
    projectId: task.projectId ?? null,
    milestoneId: task.milestoneId ?? null,
    title: task.title,
    area: task.area,
    scope: task.scope ?? "personal",
    priority: task.priority,
    status,
    dueAt: task.dueAt ? new Date(task.dueAt).getTime() : null,
    goalId: task.goalId ?? null,
    debtId: task.debtId ?? null,
    requiresConfirmation: Boolean(task.requiresConfirmation),
    notes: task.notes ?? null,
  };
}
