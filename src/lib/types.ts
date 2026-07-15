export type AvatarColor = "indigo" | "sky" | "amber" | "rose" | "emerald";

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: AvatarColor;
}

export interface Project {
  id: string;
  name: string;
  /** Short uppercase code used to mint ticket ids, e.g. "ENG" → ENG-1, ENG-2. */
  ticketPrefix: string;
  /** Next number to hand out for this project's ticket ids. */
  nextTicketNumber: number;
  /** ISO date. Entries dated on/before this are immutable (billed period). Null = nothing locked yet. */
  lockedThrough: string | null;
}

/** Roles are project-scoped, never global — see src/lib/permissions.ts */
export type ProjectRole = "developer" | "manager";

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  updatedAt: string;
}

export type TimesheetStatus = "pending" | "approved" | "rejected";

export interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  date: string; // ISO yyyy-MM-dd
  hours: number;
  note?: string;
  status: TimesheetStatus;
  rejectionReason?: string;
}

export type ChatRole = "user" | "assistant";

export type ChatActionType =
  | "log_time"
  | "update_task_status"
  | "assign_task"
  | "approve_timesheet"
  | "reject_timesheet";

export interface ChatAction {
  id: string;
  type: ChatActionType;
  label: string;
  payload: Record<string, unknown>;
}

export interface ChatActionResult {
  actionId: string;
  ok: boolean;
  message: string;
  recordType?: "task" | "timesheet";
  recordId?: string;
}

export type ChatTurnStatus = "pending" | "confirmed" | "cancelled";

export interface ChatClarifyOption {
  label: string;
  value: string;
}

export interface ChatClarify {
  question: string;
  options: ChatClarifyOption[];
}

/**
 * One row of an "hours invested vs wasted" chart — approved hours are
 * validated/invested work, pending is unresolved, rejected is wasted
 * (a manager explicitly declined it). hours is the total of the three.
 */
export interface HoursBreakdownRow {
  key: string;
  label: string;
  approvedHours: number;
  pendingHours: number;
  rejectedHours: number;
  hours: number;
}

export type ChatSummaryRow = HoursBreakdownRow & { projectId: string; projectName: string };

export interface ChatSummary {
  userId: string;
  userName: string;
  rangeLabel: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalHours: number;
  approvedHours: number;
  pendingHours: number;
  rejectedHours: number;
  byProject: ChatSummaryRow[];
  csvRows: string[][];
}

/** Manager-only rollup across one or more projects they manage. */
export interface TeamSummary {
  scopeLabel: string;
  rangeLabel: string;
  totalHours: number;
  approvedHours: number;
  pendingHours: number;
  rejectedHours: number;
  byProject: HoursBreakdownRow[];
  byMember: HoursBreakdownRow[];
  csvRows: string[][];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  actions?: ChatAction[];
  turnStatus?: ChatTurnStatus;
  results?: ChatActionResult[];
  clarify?: ChatClarify;
  clarifyResolved?: string;
  summary?: ChatSummary;
  teamSummary?: TeamSummary;
  createdAt: string;
}
