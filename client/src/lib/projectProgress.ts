export type ProjectTaskProgressSource = { status: string; archivedAt?: Date | string | null };

export function projectTasksForProgress<T extends ProjectTaskProgressSource>(tasks: T[]) {
  return tasks.filter(task => task.status !== "cancelled");
}

export function projectTasksForView<T extends ProjectTaskProgressSource>(tasks: T[], showArchived: boolean) {
  return tasks.filter(task => showArchived || (!task.archivedAt && task.status !== "cancelled"));
}

export function projectProgress(tasks: ProjectTaskProgressSource[]) {
  const relevant = projectTasksForProgress(tasks);
  const completed = relevant.filter(task => task.status === "completed" || Boolean(task.archivedAt));
  return { total: relevant.length, completed: completed.length, percent: relevant.length ? Math.round((completed.length / relevant.length) * 100) : 0 };
}
