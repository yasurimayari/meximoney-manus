export type ProjectGoalLink = {
  id: number;
  projectId?: number | null;
  entityId?: number | null;
  status?: string | null;
  name: string;
};

export function goalForProject(goals: ProjectGoalLink[], projectId: number) {
  return goals.find(goal => goal.projectId === projectId) ?? null;
}

export function goalsEligibleForProject(goals: ProjectGoalLink[], entityId: number | null, selectedGoalId?: number | null) {
  return goals.filter(goal => {
    if (goal.status === "cancelled" && goal.id !== selectedGoalId) return false;
    if (goal.id === selectedGoalId) return true;
    return (goal.entityId ?? null) === entityId;
  });
}
