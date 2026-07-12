import type { Project, ProjectMember, Task, TimesheetEntry, User } from "@/lib/types";

// Supabase/PostgREST returns snake_case columns; the app's types are camelCase.
// These are the only place that boundary is crossed.

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatar_color: User["avatarColor"];
}
export function toUser(row: ProfileRow): User {
  return { id: row.id, email: row.email, name: row.name, initials: row.initials, avatarColor: row.avatar_color };
}

export interface ProjectRow {
  id: string;
  name: string;
  ticket_prefix: string;
  next_ticket_number: number;
  locked_through: string | null;
}
export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    ticketPrefix: row.ticket_prefix,
    nextTicketNumber: row.next_ticket_number,
    lockedThrough: row.locked_through,
  };
}

export interface ProjectMemberRow {
  id: string;
  user_id: string;
  project_id: string;
  role: ProjectMember["role"];
}
export function toProjectMember(row: ProjectMemberRow): ProjectMember {
  return { id: row.id, userId: row.user_id, projectId: row.project_id, role: row.role };
}

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  project_id: string;
  assignee_id: string | null;
  updated_at: string;
}
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    updatedAt: row.updated_at,
  };
}

export interface TimesheetEntryRow {
  id: string;
  user_id: string;
  project_id: string;
  task_id: string | null;
  date: string;
  hours: number;
  note: string | null;
  status: TimesheetEntry["status"];
  rejection_reason: string | null;
}
export function toTimesheetEntry(row: TimesheetEntryRow): TimesheetEntry {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    taskId: row.task_id,
    date: row.date,
    hours: Number(row.hours),
    note: row.note ?? undefined,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
  };
}
