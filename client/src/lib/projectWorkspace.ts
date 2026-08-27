import { projectProgress } from "./projectProgress";

export type WorkspaceProject = { id: number; status: string };
export type WorkspaceTask = { id: number; projectId?: number | null; title: string; status: string; priority: string; dueAt?: Date | string | null; archivedAt?: Date | string | null };
export type ProjectFocusFilter = "all" | "urgent" | "week" | "priority" | "unscheduled";
export type ProjectFocusOrder = "urgency" | "date" | "priority";

const priorityWeight: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function buildProjectWorkspaceOverview(projects: WorkspaceProject[], tasks: WorkspaceTask[]) {
  const progress = projectProgress(tasks);
  const activeProjects = projects.filter(project => ["active", "planned", "paused"].includes(project.status)).length;
  const openTasks = tasks.filter(task => task.status !== "completed" && task.status !== "cancelled" && !task.archivedAt).length;
  return { activeProjects, totalProjects: projects.length, openTasks, closedTasks: progress.completed, totalTasks: progress.total, percent: progress.percent };
}

export function projectFocusQueue(tasks: WorkspaceTask[], maxItems = 5, filter: ProjectFocusFilter = "all", order: ProjectFocusOrder = "urgency", referenceDate = new Date()) {
  const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
  const openTasks = tasks.filter(task => task.status !== "completed" && task.status !== "cancelled" && !task.archivedAt);
  const filtered = openTasks.filter(task => {
    const dueAt = task.dueAt ? new Date(task.dueAt).getTime() : null;
    if (filter === "urgent") return dueAt !== null && dueAt <= startOfToday;
    if (filter === "week") return dueAt !== null && dueAt > startOfToday && dueAt <= endOfWeek;
    if (filter === "priority") return ["critical", "high"].includes(task.priority);
    if (filter === "unscheduled") return dueAt === null;
    return true;
  });
  const dueValue = (task: WorkspaceTask) => task.dueAt ? new Date(task.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const urgencyValue = (task: WorkspaceTask) => {
    const dueAt = dueValue(task);
    return dueAt <= startOfToday ? dueAt - startOfToday : dueAt;
  };
  return filtered.sort((left, right) => {
    if (order === "priority") {
      const priorityDifference = (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4);
      return priorityDifference || dueValue(left) - dueValue(right);
    }
    if (order === "date") return dueValue(left) - dueValue(right) || (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4);
    return urgencyValue(left) - urgencyValue(right) || (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4);
  }).slice(0, maxItems);
}
