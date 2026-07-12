import { createClient } from "@/lib/supabase/browser";
import type {
  ChatAction,
  ChatClarify,
  ChatSummary,
  Project,
  ProjectMember,
  Task,
  TaskPriority,
  TaskStatus,
  TimesheetEntry,
  User,
} from "@/lib/types";

/**
 * Client-side data layer. Auth talks to Supabase directly; everything else
 * goes through the Next.js Route Handlers under src/app/api/**, which use
 * the service-role key and enforce permissions server-side (see
 * src/lib/permissions.ts) against the caller's session cookie.
 */

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

// ---- Auth ---------------------------------------------------------------

export async function hasSession(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const supabase = createClient();
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "U";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim(), initials, avatar_color: "indigo" } },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// ---- Bootstrap ------------------------------------------------------------

export interface BootstrapData {
  currentUser: User;
  users: User[];
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  timesheet: TimesheetEntry[];
}

export async function bootstrap(): Promise<BootstrapData> {
  return apiFetch<BootstrapData>("/api/bootstrap");
}

// ---- Projects ---------------------------------------------------------

export async function createProject(input: { name: string; ticketPrefix: string }): Promise<Project> {
  return apiFetch<Project>("/api/projects", { method: "POST", body: JSON.stringify(input) });
}

// ---- Tasks ----------------------------------------------------------------

export async function createTask(input: {
  title: string;
  description: string;
  projectId: string;
  priority: TaskPriority;
  assigneeId: string | null;
}): Promise<Task> {
  return apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
}

export async function updateTaskFields(
  taskId: string,
  patch: Partial<Pick<Task, "title" | "description" | "priority">>
): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignTask(taskId: string, assigneeId: string | null): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${encodeURIComponent(taskId)}/assignee`, {
    method: "PATCH",
    body: JSON.stringify({ assigneeId }),
  });
}

// ---- Timesheet --------------------------------------------------------

export async function logHours(input: {
  projectId: string;
  taskId?: string | null;
  date: string;
  hours: number;
  note?: string;
}): Promise<TimesheetEntry> {
  return apiFetch<TimesheetEntry>("/api/timesheet", { method: "POST", body: JSON.stringify(input) });
}

export async function approveEntry(entryId: string): Promise<TimesheetEntry> {
  return apiFetch<TimesheetEntry>(`/api/timesheet/${encodeURIComponent(entryId)}/approve`, { method: "POST" });
}

export async function rejectEntry(entryId: string, reason: string): Promise<TimesheetEntry> {
  return apiFetch<TimesheetEntry>(`/api/timesheet/${encodeURIComponent(entryId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ---- Chat (AI) ----------------------------------------------------------

export interface ChatTurnResponse {
  reply: string;
  actions?: ChatAction[];
  clarify?: ChatClarify;
  summary?: ChatSummary;
}

export async function sendChat(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatTurnResponse> {
  return apiFetch<ChatTurnResponse>("/api/chat", { method: "POST", body: JSON.stringify({ message, history }) });
}
