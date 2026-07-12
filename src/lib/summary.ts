import type { ChatSummary, Project, Task, TimesheetEntry, User } from "@/lib/types";

export function buildSummary(params: {
  targetUser: User;
  rangeLabel: string;
  rangeStart: string;
  rangeEnd: string;
  tasks: Task[];
  timesheet: TimesheetEntry[];
  projects: Project[];
}): ChatSummary {
  const { targetUser, rangeLabel, rangeStart, rangeEnd, tasks, timesheet, projects } = params;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project";

  const inRange = (date: string) => date >= rangeStart && date <= rangeEnd;

  const tasksCompleted = tasks.filter(
    (t) => t.assigneeId === targetUser.id && t.status === "done" && inRange(t.updatedAt.slice(0, 10))
  ).length;
  const tasksInProgress = tasks.filter((t) => t.assigneeId === targetUser.id && t.status === "in_progress").length;

  const entries = timesheet.filter((e) => e.userId === targetUser.id && inRange(e.date));
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const pendingHours = entries.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.hours, 0);

  const byProjectMap = new Map<string, number>();
  for (const e of entries) byProjectMap.set(e.projectId, (byProjectMap.get(e.projectId) ?? 0) + e.hours);
  const byProject = Array.from(byProjectMap.entries())
    .map(([projectId, hours]) => ({ projectId, projectName: projectName(projectId), hours }))
    .sort((a, b) => b.hours - a.hours);

  const csvRows: string[][] = [["Date", "Project", "Task", "Hours", "Note", "Status"]];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const task = e.taskId ? tasks.find((t) => t.id === e.taskId) : undefined;
    csvRows.push([e.date, projectName(e.projectId), task?.title ?? "", String(e.hours), e.note ?? "", e.status]);
  }

  return {
    userId: targetUser.id,
    userName: targetUser.name,
    rangeLabel,
    tasksCompleted,
    tasksInProgress,
    totalHours,
    pendingHours,
    byProject,
    csvRows,
  };
}
