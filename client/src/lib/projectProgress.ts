export function projectProgress(tasks: Array<{ status: string; archivedAt?: Date | string | null }>) {
  const relevant = tasks.filter(task => task.status !== "cancelled");
  const completed = relevant.filter(task => task.status === "completed" || Boolean(task.archivedAt));
  return { total: relevant.length, completed: completed.length, percent: relevant.length ? Math.round((completed.length / relevant.length) * 100) : 0 };
}
