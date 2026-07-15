import type { HoursBreakdownRow, ChatSummary, ChatSummaryRow, Project, Task, TeamSummary, TimesheetEntry, User } from "@/lib/types";

/** Buckets a set of timesheet entries by approval status — the "invested vs wasted" signal. */
function bucketByStatus(entries: TimesheetEntry[]): Pick<HoursBreakdownRow, "approvedHours" | "pendingHours" | "rejectedHours" | "hours"> {
  let approvedHours = 0;
  let pendingHours = 0;
  let rejectedHours = 0;
  for (const e of entries) {
    if (e.status === "approved") approvedHours += e.hours;
    else if (e.status === "pending") pendingHours += e.hours;
    else rejectedHours += e.hours;
  }
  return { approvedHours, pendingHours, rejectedHours, hours: approvedHours + pendingHours + rejectedHours };
}

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
  const overall = bucketByStatus(entries);

  const projectIds = Array.from(new Set(entries.map((e) => e.projectId)));
  const byProject: ChatSummaryRow[] = projectIds
    .map((projectId) => {
      const bucket = bucketByStatus(entries.filter((e) => e.projectId === projectId));
      return { key: projectId, label: projectName(projectId), projectId, projectName: projectName(projectId), ...bucket };
    })
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
    totalHours: overall.hours,
    approvedHours: overall.approvedHours,
    pendingHours: overall.pendingHours,
    rejectedHours: overall.rejectedHours,
    byProject,
    csvRows,
  };
}

/**
 * Manager-only rollup across one or more projects they manage: hours by
 * project and hours by team member, each split into approved/pending/
 * rejected so a manager can see both where time goes and how much of it
 * was actually validated versus wasted.
 */
export function buildTeamSummary(params: {
  scopeLabel: string;
  rangeLabel: string;
  rangeStart: string;
  rangeEnd: string;
  projectIds: string[];
  users: User[];
  projects: Project[];
  members: { userId: string; projectId: string }[];
  timesheet: TimesheetEntry[];
}): TeamSummary {
  const { scopeLabel, rangeLabel, rangeStart, rangeEnd, projectIds, users, projects, members, timesheet } = params;
  const inRange = (date: string) => date >= rangeStart && date <= rangeEnd;
  const projectIdSet = new Set(projectIds);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project";
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown";

  const entries = timesheet.filter((e) => projectIdSet.has(e.projectId) && inRange(e.date));
  const overall = bucketByStatus(entries);

  const byProject: HoursBreakdownRow[] = projectIds
    .map((projectId) => ({ key: projectId, label: projectName(projectId), ...bucketByStatus(entries.filter((e) => e.projectId === projectId)) }))
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const memberUserIds = Array.from(new Set(members.filter((m) => projectIdSet.has(m.projectId)).map((m) => m.userId)));
  const byMember: HoursBreakdownRow[] = memberUserIds
    .map((userId) => ({ key: userId, label: userName(userId), ...bucketByStatus(entries.filter((e) => e.userId === userId)) }))
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const csvRows: string[][] = [["User", "Project", "Date", "Task", "Hours", "Status"]];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    csvRows.push([userName(e.userId), projectName(e.projectId), e.date, e.taskId ?? "", String(e.hours), e.status]);
  }

  return {
    scopeLabel,
    rangeLabel,
    totalHours: overall.hours,
    approvedHours: overall.approvedHours,
    pendingHours: overall.pendingHours,
    rejectedHours: overall.rejectedHours,
    byProject,
    byMember,
    csvRows,
  };
}
