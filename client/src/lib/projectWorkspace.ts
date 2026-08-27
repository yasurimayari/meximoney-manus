import { projectProgress } from "./projectProgress";

export type WorkspaceProject = { id: number; status: string };
export type WorkspaceTask = { id: number; projectId?: number | null; title: string; status: string; priority: string; dueAt?: Date | string | null; archivedAt?: Date | string | null };

const priorityWeight: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function buildProjectWorkspaceOverview(projects: WorkspaceProject[], tasks: WorkspaceTask[]) {
  const progress = projectProgress(tasks);
  const activeProjects = projects.filter(project => ["active", "planned", "paused"].includes(project.status)).length;
  const openTasks = tasks.filter(task => task.status !== "completed" && task.status !== "cancelled" && !task.archivedAt).length;
  return { activeProjects, totalProjects: projects.length, openTasks, closedTasks: progress.completed, totalTasks: progress.total, percent: progress.percent };
}

export function projectFocusQueue(tasks: WorkspaceTask[], maxItems = 5) {
  return tasks.filter(task => task.status !== "completed" && task.status !== "cancelled" && !task.archivedAt).sort((left, right) => {
    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4);
  }).slice(0, maxItems);
}
