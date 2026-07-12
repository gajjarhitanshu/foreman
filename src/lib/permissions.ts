import type { Project, ProjectMember, ProjectRole, Task, TimesheetEntry } from "@/lib/types";

/**
 * Single source of truth for every permission decision in the app.
 * The UI and the AI Orchestrator both call these functions — never
 * duplicate a check inline. Per FRD §6: divergence between the two
 * surfaces is a defect, not an acceptable variance.
 */

export function roleOn(members: ProjectMember[], userId: string, projectId: string): ProjectRole | null {
  return members.find((m) => m.userId === userId && m.projectId === projectId)?.role ?? null;
}

export function isProjectMember(members: ProjectMember[], userId: string, projectId: string): boolean {
  return roleOn(members, userId, projectId) !== null;
}

export function isManagerOn(members: ProjectMember[], userId: string, projectId: string): boolean {
  return roleOn(members, userId, projectId) === "manager";
}

export function memberProjectIds(members: ProjectMember[], userId: string): string[] {
  return members.filter((m) => m.userId === userId).map((m) => m.projectId);
}

export function managedProjectIds(members: ProjectMember[], userId: string): string[] {
  return members.filter((m) => m.userId === userId && m.role === "manager").map((m) => m.projectId);
}

/** Visible project scope is identical for everyone: membership on that project, any role. */
export function visibleProjects<T extends { id: string }>(
  members: ProjectMember[],
  userId: string,
  projects: T[]
): T[] {
  const ids = new Set(memberProjectIds(members, userId));
  return projects.filter((p) => ids.has(p.id));
}

export function visibleTasks(members: ProjectMember[], userId: string, tasks: Task[]): Task[] {
  const ids = new Set(memberProjectIds(members, userId));
  return tasks.filter((t) => ids.has(t.projectId));
}

export function visibleTimesheetEntries(
  members: ProjectMember[],
  userId: string,
  entries: TimesheetEntry[]
): TimesheetEntry[] {
  const ids = new Set(memberProjectIds(members, userId));
  return entries.filter((e) => ids.has(e.projectId));
}

export function canChangeTaskStatus(members: ProjectMember[], userId: string, task: Task): boolean {
  return task.assigneeId === userId || isManagerOn(members, userId, task.projectId);
}

export function canAssignTask(members: ProjectMember[], userId: string, projectId: string): boolean {
  return isManagerOn(members, userId, projectId);
}

export function canCreateTask(members: ProjectMember[], userId: string, projectId: string): boolean {
  return isProjectMember(members, userId, projectId);
}

export function canLogTime(members: ProjectMember[], userId: string, projectId: string): boolean {
  return isProjectMember(members, userId, projectId);
}

export function canApproveEntry(members: ProjectMember[], userId: string, entry: TimesheetEntry): boolean {
  return isManagerOn(members, userId, entry.projectId) && entry.userId !== userId;
}

export function canQuerySummaryFor(members: ProjectMember[], askerId: string, targetUserId: string): boolean {
  if (askerId === targetUserId) return true;
  return managedProjectIds(members, askerId).length > 0;
}

/** A period is locked once the entry's date falls on/before the project's lockedThrough date. */
export function isPeriodLocked(project: Pick<Project, "lockedThrough">, date: string): boolean {
  return project.lockedThrough !== null && date <= project.lockedThrough;
}

export interface PermissionDenial {
  ok: false;
  reason: string;
}
export interface PermissionGrant {
  ok: true;
}
export type PermissionResult = PermissionGrant | PermissionDenial;

export function deny(reason: string): PermissionDenial {
  return { ok: false, reason };
}
export const GRANT: PermissionGrant = { ok: true };
