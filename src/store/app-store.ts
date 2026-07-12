import { create } from "zustand";
import * as api from "@/lib/api";
import { toCsv } from "@/lib/csv";
import type {
  ChatAction,
  ChatActionResult,
  ChatMessage,
  Project,
  ProjectMember,
  Task,
  TaskPriority,
  TaskStatus,
  TimesheetEntry,
  User,
} from "@/lib/types";

interface OpResult {
  ok: boolean;
  error?: string;
}

interface AppState {
  status: "idle" | "loading" | "ready";
  currentUser: User | null;
  users: User[];
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  timesheet: TimesheetEntry[];
  chat: ChatMessage[];
  chatPending: boolean;
  chatDockOpen: boolean;
  chatFocusSignal: number;
  taskDrawerId: string | null;

  hydrate: () => Promise<void>;
  setChatDockOpen: (open: boolean) => void;
  requestFocusChat: () => void;
  openTaskDrawer: (taskId: string) => void;
  closeTaskDrawer: () => void;

  signIn: (email: string, password: string) => Promise<OpResult>;
  signUp: (name: string, email: string, password: string) => Promise<OpResult & { needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;

  createProject: (input: { name: string; ticketPrefix: string }) => Promise<OpResult & { project?: Project }>;
  createTask: (input: {
    title: string;
    description: string;
    projectId: string;
    priority: TaskPriority;
    assigneeId: string | null;
  }) => Promise<OpResult & { task?: Task }>;
  updateTaskFields: (
    taskId: string,
    patch: Partial<Pick<Task, "title" | "description" | "priority">>
  ) => Promise<OpResult>;
  moveTask: (taskId: string, status: TaskStatus) => Promise<OpResult>;
  assignTask: (taskId: string, assigneeId: string | null) => Promise<OpResult>;

  logHours: (input: { projectId: string; taskId?: string | null; date: string; hours: number; note?: string }) => Promise<OpResult>;
  approveEntry: (entryId: string) => Promise<OpResult>;
  rejectEntry: (entryId: string, reason: string) => Promise<OpResult>;

  sendChatMessage: (content: string) => Promise<void>;
  resolveChatTurn: (messageId: string, confirm: boolean) => Promise<void>;
  resolveClarify: (messageId: string, value: string) => Promise<void>;
  exportSummaryCsv: (messageId: string) => void;
}

function systemMessage(content: string): ChatMessage {
  return { id: `m_${Math.random().toString(36).slice(2, 9)}`, role: "assistant", content, createdAt: new Date().toISOString() };
}

function opError(err: unknown, fallback: string): OpResult {
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export const useAppStore = create<AppState>((set, get) => ({
  status: "idle",
  currentUser: null,
  users: [],
  projects: [],
  members: [],
  tasks: [],
  timesheet: [],
  chat: [
    systemMessage(
      'Hi! I can log time, update tasks, assign work, approve/reject entries, or summarize your work — just ask, and I\'ll confirm before I write anything. Try "log 4h on Project A today".'
    ),
  ],
  chatPending: false,
  chatDockOpen: true,
  chatFocusSignal: 0,
  taskDrawerId: null,

  setChatDockOpen: (open) => set({ chatDockOpen: open }),
  requestFocusChat: () => set((s) => ({ chatDockOpen: true, chatFocusSignal: s.chatFocusSignal + 1 })),
  openTaskDrawer: (taskId) => set({ taskDrawerId: taskId, chatDockOpen: false }),
  closeTaskDrawer: () => set({ taskDrawerId: null }),

  hydrate: async () => {
    set({ status: "loading" });
    if (!(await api.hasSession())) {
      set({ currentUser: null, status: "ready" });
      return;
    }
    try {
      const data = await api.bootstrap();
      set({ ...data, status: "ready" });
    } catch {
      set({ currentUser: null, status: "ready" });
    }
  },

  signIn: async (email, password) => {
    try {
      await api.signIn(email, password);
      const data = await api.bootstrap();
      set({ ...data });
      return { ok: true };
    } catch (err) {
      return opError(err, "Could not sign in.");
    }
  },

  signUp: async (name, email, password) => {
    try {
      await api.signUp(name, email, password);
      if (!(await api.hasSession())) {
        return { ok: true, needsEmailConfirmation: true };
      }
      const data = await api.bootstrap();
      set({ ...data });
      return { ok: true };
    } catch (err) {
      return opError(err, "Could not create account.");
    }
  },

  signOut: async () => {
    await api.signOut();
    set({ currentUser: null, users: [], projects: [], members: [], tasks: [], timesheet: [] });
  },

  createProject: async (input) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    try {
      const project = await api.createProject(input);
      set({ projects: [...get().projects, project] });
      return { ok: true, project };
    } catch (err) {
      return opError(err, "Could not create project.");
    }
  },

  createTask: async (input) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    try {
      const task = await api.createTask(input);
      set({ tasks: [...get().tasks, task] });
      return { ok: true, task };
    } catch (err) {
      return opError(err, "Could not create task.");
    }
  },

  updateTaskFields: async (taskId, patch) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    try {
      const task = await api.updateTaskFields(taskId, patch);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? task : t)) });
      return { ok: true };
    } catch (err) {
      return opError(err, "Could not update task.");
    }
  },

  moveTask: async (taskId, status) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    const prev = get().tasks;
    set({ tasks: prev.map((t) => (t.id === taskId ? { ...t, status } : t)) });
    try {
      const task = await api.updateTaskStatus(taskId, status);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? task : t)) });
      return { ok: true };
    } catch (err) {
      set({ tasks: prev });
      return opError(err, "Could not move task.");
    }
  },

  assignTask: async (taskId, assigneeId) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    try {
      const task = await api.assignTask(taskId, assigneeId);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? task : t)) });
      return { ok: true };
    } catch (err) {
      return opError(err, "Could not assign task.");
    }
  },

  logHours: async (input) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    try {
      const entry = await api.logHours(input);
      set({ timesheet: [...get().timesheet, entry] });
      return { ok: true };
    } catch (err) {
      return opError(err, "Could not log hours.");
    }
  },

  approveEntry: async (entryId) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    const prev = get().timesheet;
    set({ timesheet: prev.map((e) => (e.id === entryId ? { ...e, status: "approved" } : e)) });
    try {
      const entry = await api.approveEntry(entryId);
      set({ timesheet: get().timesheet.map((e) => (e.id === entryId ? entry : e)) });
      return { ok: true };
    } catch (err) {
      set({ timesheet: prev });
      return opError(err, "Could not approve entry.");
    }
  },

  rejectEntry: async (entryId, reason) => {
    if (!get().currentUser) return { ok: false, error: "Not signed in." };
    const prev = get().timesheet;
    try {
      const entry = await api.rejectEntry(entryId, reason);
      set({ timesheet: get().timesheet.map((e) => (e.id === entryId ? entry : e)) });
      return { ok: true };
    } catch (err) {
      set({ timesheet: prev });
      return opError(err, "Could not reject entry.");
    }
  },

  sendChatMessage: async (content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const user = get().currentUser;
    if (!user) return;

    // Snapshot history before appending the new user turn, so it isn't duplicated below.
    const history = get().chat.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChatMessage = {
      id: `m_${Math.random().toString(36).slice(2, 9)}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    set({ chat: [...get().chat, userMsg], chatPending: true });

    try {
      const result = await api.sendChat(trimmed, history);
      const assistantMsg: ChatMessage = {
        id: `m_${Math.random().toString(36).slice(2, 9)}`,
        role: "assistant",
        content: result.reply,
        actions: result.actions,
        turnStatus: result.actions?.length ? "pending" : undefined,
        clarify: result.clarify,
        summary: result.summary,
        createdAt: new Date().toISOString(),
      };
      set({ chat: [...get().chat, assistantMsg], chatPending: false });
    } catch (err) {
      set({
        chat: [...get().chat, systemMessage(err instanceof Error ? err.message : "Something went wrong talking to the assistant.")],
        chatPending: false,
      });
    }
  },

  resolveChatTurn: async (messageId, confirm) => {
    const msg = get().chat.find((m) => m.id === messageId);
    if (!msg?.actions?.length) return;
    const user = get().currentUser;
    if (!user) return;

    set({ chat: get().chat.map((m) => (m.id === messageId ? { ...m, turnStatus: confirm ? "confirmed" : "cancelled" } : m)) });

    if (!confirm) return;

    // Validate every action before applying any of them — no partial application (FRD §7.6).
    const failures: string[] = [];
    for (const action of msg.actions) {
      const check = validateAction(get(), user.id, action);
      if (!check.ok) failures.push(`${action.label} — ${check.error}`);
    }

    if (failures.length > 0) {
      set({
        chat: get().chat.map((m) =>
          m.id === messageId
            ? {
                ...m,
                results: msg.actions!.map((a) => ({ actionId: a.id, ok: false, message: "Blocked — nothing was changed." })),
              }
            : m
        ),
      });
      set({ chat: [...get().chat, systemMessage(`Couldn't complete that turn:\n${failures.map((f) => `• ${f}`).join("\n")}`)] });
      return;
    }

    const results: ChatActionResult[] = [];
    for (const action of msg.actions) {
      results.push(await applyAction(get(), action));
    }

    set({
      chat: get().chat.map((m) => (m.id === messageId ? { ...m, results } : m)),
    });
  },

  resolveClarify: async (messageId, value) => {
    set({ chat: get().chat.map((m) => (m.id === messageId ? { ...m, clarifyResolved: value } : m)) });
    await get().sendChatMessage(value);
  },

  exportSummaryCsv: (messageId) => {
    const msg = get().chat.find((m) => m.id === messageId);
    if (!msg?.summary) return;
    const csv = toCsv(msg.summary.csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${msg.summary.userName.replace(/\s+/g, "-").toLowerCase()}-summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));

function validateAction(state: AppState, actorId: string, action: ChatAction): OpResult {
  if (action.type === "update_task_status") {
    const { taskId } = action.payload as { taskId: string };
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const isAssignee = task.assigneeId === actorId;
    const isManager = state.members.some((m) => m.userId === actorId && m.projectId === task.projectId && m.role === "manager");
    if (!isAssignee && !isManager) return { ok: false, error: "Only the assignee or a manager on this project can do that." };
  }
  if (action.type === "assign_task") {
    const { taskId, assigneeId } = action.payload as { taskId: string; assigneeId: string | null };
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const isManager = state.members.some((m) => m.userId === actorId && m.projectId === task.projectId && m.role === "manager");
    if (!isManager) return { ok: false, error: "Only a manager on this project can assign tasks." };
    if (assigneeId && !state.members.some((m) => m.userId === assigneeId && m.projectId === task.projectId)) {
      return { ok: false, error: "That person isn't a member of this project." };
    }
  }
  if (action.type === "log_time") {
    const { projectId, date } = action.payload as { projectId: string; date: string };
    const isMember = state.members.some((m) => m.userId === actorId && m.projectId === projectId);
    if (!isMember) return { ok: false, error: "You're not a member of that project." };
    const project = state.projects.find((p) => p.id === projectId);
    if (project?.lockedThrough && date <= project.lockedThrough) {
      return { ok: false, error: `${project.name}'s timesheet is locked through ${project.lockedThrough}.` };
    }
  }
  if (action.type === "approve_timesheet" || action.type === "reject_timesheet") {
    const { entryId } = action.payload as { entryId: string };
    const entry = state.timesheet.find((e) => e.id === entryId);
    if (!entry) return { ok: false, error: "Timesheet entry not found." };
    if (entry.userId === actorId) return { ok: false, error: "You can't approve or reject your own entry." };
    const isManager = state.members.some((m) => m.userId === actorId && m.projectId === entry.projectId && m.role === "manager");
    if (!isManager) return { ok: false, error: "Only a manager on this project can do that." };
    if (action.type === "reject_timesheet") {
      const { reason } = action.payload as { reason?: string };
      if (!reason?.trim()) return { ok: false, error: "A rejection reason is required." };
    }
  }
  return { ok: true };
}

async function applyAction(
  store: AppState,
  action: ChatAction
): Promise<{ actionId: string; ok: boolean; message: string; recordType?: "task" | "timesheet"; recordId?: string }> {
  const state = useAppStore.getState();
  try {
    if (action.type === "log_time") {
      const { projectId, taskId, hours, date } = action.payload as {
        projectId: string;
        taskId?: string | null;
        hours: number;
        date: string;
      };
      const res = await state.logHours({ projectId, taskId, hours, date });
      if (!res.ok) throw new Error(res.error);
      return { actionId: action.id, ok: true, message: "Logged.", recordType: "timesheet" };
    }
    if (action.type === "update_task_status") {
      const { taskId, status } = action.payload as { taskId: string; status: TaskStatus };
      const res = await state.moveTask(taskId, status);
      if (!res.ok) throw new Error(res.error);
      return { actionId: action.id, ok: true, message: "Task updated.", recordType: "task", recordId: taskId };
    }
    if (action.type === "assign_task") {
      const { taskId, assigneeId } = action.payload as { taskId: string; assigneeId: string | null };
      const res = await state.assignTask(taskId, assigneeId);
      if (!res.ok) throw new Error(res.error);
      return { actionId: action.id, ok: true, message: "Assigned.", recordType: "task", recordId: taskId };
    }
    if (action.type === "approve_timesheet") {
      const { entryId } = action.payload as { entryId: string };
      const res = await state.approveEntry(entryId);
      if (!res.ok) throw new Error(res.error);
      return { actionId: action.id, ok: true, message: "Approved.", recordType: "timesheet", recordId: entryId };
    }
    if (action.type === "reject_timesheet") {
      const { entryId, reason } = action.payload as { entryId: string; reason: string };
      const res = await state.rejectEntry(entryId, reason);
      if (!res.ok) throw new Error(res.error);
      return { actionId: action.id, ok: true, message: "Rejected.", recordType: "timesheet", recordId: entryId };
    }
    return { actionId: action.id, ok: false, message: "Unknown action." };
  } catch (err) {
    return { actionId: action.id, ok: false, message: err instanceof Error ? err.message : "Failed." };
  }
}
