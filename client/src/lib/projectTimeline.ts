export type ProjectTimelineProject = { id: number; name: string; color: string; startsAt?: Date | string | null; targetAt?: Date | string | null };
export type ProjectTimelineMilestone = { id: number; projectId: number; title: string; targetAt?: Date | string | null };
export type ProjectTimelineTask = { id: number; projectId?: number | null; title: string; status: string; dueAt?: Date | string | null };

export type ProjectTimelineItem = {
  id: string;
  date: Date | string;
  title: string;
  note: string;
  source: "project_start" | "project_target" | "milestone" | "task";
  project: ProjectTimelineProject;
  task?: ProjectTimelineTask;
};

export function buildProjectTimelineItems(projects: ProjectTimelineProject[], milestones: ProjectTimelineMilestone[], tasks: ProjectTimelineTask[]) {
  const projectById = new Map(projects.map(project => [project.id, project]));
  const items: ProjectTimelineItem[] = [];

  projects.forEach(project => {
    if (project.startsAt) items.push({ id: `project-start-${project.id}`, date: project.startsAt, title: `Inicio · ${project.name}`, note: "Proyecto", source: "project_start", project });
    if (project.targetAt) items.push({ id: `project-target-${project.id}`, date: project.targetAt, title: `Meta · ${project.name}`, note: "Proyecto", source: "project_target", project });
  });
  milestones.forEach(milestone => {
    const project = projectById.get(milestone.projectId);
    if (project && milestone.targetAt) items.push({ id: `milestone-${milestone.id}`, date: milestone.targetAt, title: milestone.title, note: "Parte del proyecto", source: "milestone", project });
  });
  tasks.forEach(task => {
    const project = task.projectId ? projectById.get(task.projectId) : undefined;
    if (project && task.dueAt) items.push({ id: `task-${task.id}`, date: task.dueAt, title: task.title, note: task.status, source: "task", project, task });
  });

  return items.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

export function projectsWithoutTimelineDate(projects: ProjectTimelineProject[], timelineItems: ProjectTimelineItem[]) {
  const projectIdsWithDates = new Set(timelineItems.map(item => item.project.id));
  return projects.filter(project => !projectIdsWithDates.has(project.id));
}
