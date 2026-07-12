import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toUser, toProject, toProjectMember, toTask, toTimesheetEntry } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canQuerySummaryFor } from "@/lib/permissions";
import { buildSummary } from "@/lib/summary";
import type {
  ChatAction,
  ChatActionType,
  Project,
  ProjectMember,
  Task,
  TaskStatus,
  TimesheetEntry,
  User,
} from "@/lib/types";

/**
 * AI-native chat endpoint. Claude reads the actor's scoped data (given in the
 * system prompt) and proposes tool calls; this route never executes a
 * mutation itself — it only translates a tool_use block into a ChatAction
 * for the client's existing confirm-before-write flow (see app-store.ts
 * validateAction/applyAction), which re-checks permissions server-side via
 * the Route Handlers under src/app/api/**. get_summary is the one read-only
 * exception and is answered directly.
 */

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "log_time",
    description:
      "Propose logging hours worked on a project for the acting user. This only proposes the action — it will be shown to the user for confirmation before anything is saved.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Exact project id from the context below." },
        taskId: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Optional exact ticket id (e.g. 'ENG-1') to link this time to.",
        },
        hours: { type: "number", description: "Hours worked, can be fractional (e.g. 1.5)." },
        date: { type: "string", description: "ISO date yyyy-MM-dd. Resolve relative dates against today's date given below." },
        note: { type: "string", description: "Optional short note about the work done." },
      },
      required: ["projectId", "hours", "date"],
    },
  },
  {
    name: "update_task_status",
    description: "Propose changing one task's status. For multiple tasks in one request, call this once per task in the same turn.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Exact ticket id from the context below, e.g. 'ENG-1'." },
        status: { type: "string", enum: ["todo", "in_progress", "done"] },
      },
      required: ["taskId", "status"],
    },
  },
  {
    name: "assign_task",
    description: "Propose assigning a task to a project member, or unassigning it by passing assigneeId: null.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Exact ticket id from the context below." },
        assigneeId: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Exact user id from the context below, or null to unassign.",
        },
      },
      required: ["taskId", "assigneeId"],
    },
  },
  {
    name: "approve_timesheet",
    description: "Propose approving a pending timesheet entry.",
    input_schema: {
      type: "object",
      properties: { entryId: { type: "string", description: "Exact timesheet entry id from the context below." } },
      required: ["entryId"],
    },
  },
  {
    name: "reject_timesheet",
    description: "Propose rejecting a pending timesheet entry. A reason is mandatory.",
    input_schema: {
      type: "object",
      properties: {
        entryId: { type: "string", description: "Exact timesheet entry id from the context below." },
        reason: { type: "string", description: "Required explanation for the rejection." },
      },
      required: ["entryId", "reason"],
    },
  },
  {
    name: "get_summary",
    description:
      "Read-only. Compute a work summary (hours logged, tasks completed/in progress, hours by project) for one user over a date range. No confirmation is needed — call this directly to answer 'how's X doing', 'summarize my month', 'how many hours did I log', etc.",
    input_schema: {
      type: "object",
      properties: {
        targetUserId: { type: "string", description: "Exact user id from the context below. Use the acting user's own id for 'my'/'me'." },
        rangeStart: { type: "string", description: "ISO date yyyy-MM-dd, inclusive." },
        rangeEnd: { type: "string", description: "ISO date yyyy-MM-dd, inclusive." },
        rangeLabel: { type: "string", description: "Short human label for the range, e.g. 'this week', 'July 2026'." },
      },
      required: ["targetUserId", "rangeStart", "rangeEnd", "rangeLabel"],
    },
  },
  {
    name: "ask_clarifying_question",
    description:
      "Use only when a reference is genuinely ambiguous even given the context below (e.g. two tasks with the same title in different projects, and the user didn't say which). Do not use this for anything you can resolve yourself.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, value: { type: "string" } },
            required: ["label", "value"],
          },
        },
      },
      required: ["question", "options"],
    },
  },
];

const MUTATION_TYPES: ChatActionType[] = ["log_time", "update_task_status", "assign_task", "approve_timesheet", "reject_timesheet"];

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function entryLabel(entry: TimesheetEntry, users: User[], projects: Project[]): string {
  const who = users.find((u) => u.id === entry.userId)?.name ?? "Unknown";
  const project = projects.find((p) => p.id === entry.projectId)?.name ?? "?";
  return `${who} · ${project} · ${entry.date} · ${entry.hours}h`;
}

const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

function buildAction(
  type: ChatActionType,
  input: Record<string, unknown>,
  ctx: { users: User[]; projects: Project[]; tasks: Task[]; timesheet: TimesheetEntry[] }
): ChatAction | null {
  const { users, projects, tasks, timesheet } = ctx;

  if (type === "log_time") {
    const project = projects.find((p) => p.id === input.projectId);
    if (!project) return null;
    const hours = Number(input.hours);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    const date = String(input.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const taskId = input.taskId ? String(input.taskId) : null;
    return {
      id: genId("a"),
      type,
      label: `Log ${hours}h on ${project.name} · ${date}`,
      payload: { projectId: project.id, hours, date, taskId, note: input.note ? String(input.note) : undefined },
    };
  }

  if (type === "update_task_status") {
    const task = tasks.find((t) => t.id === input.taskId);
    if (!task) return null;
    const status = input.status as TaskStatus;
    if (!STATUS_LABEL[status]) return null;
    return { id: genId("a"), type, label: `Mark "${task.title}" as ${STATUS_LABEL[status]}`, payload: { taskId: task.id, status } };
  }

  if (type === "assign_task") {
    const task = tasks.find((t) => t.id === input.taskId);
    if (!task) return null;
    const assigneeId = input.assigneeId == null ? null : String(input.assigneeId);
    if (assigneeId && !users.some((u) => u.id === assigneeId)) return null;
    const label = assigneeId
      ? `Assign "${task.title}" to ${users.find((u) => u.id === assigneeId)?.name ?? assigneeId}`
      : `Unassign "${task.title}"`;
    return { id: genId("a"), type, label, payload: { taskId: task.id, assigneeId } };
  }

  if (type === "approve_timesheet") {
    const entry = timesheet.find((e) => e.id === input.entryId);
    if (!entry) return null;
    return { id: genId("a"), type, label: `Approve ${entryLabel(entry, users, projects)}`, payload: { entryId: entry.id } };
  }

  if (type === "reject_timesheet") {
    const entry = timesheet.find((e) => e.id === input.entryId);
    if (!entry) return null;
    const reason = String(input.reason ?? "").trim();
    if (!reason) return null;
    return {
      id: genId("a"),
      type,
      label: `Reject ${entryLabel(entry, users, projects)} — "${reason}"`,
      payload: { entryId: entry.id, reason },
    };
  }

  return null;
}

function buildSystemPrompt(params: {
  actor: User;
  users: User[];
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  timesheet: TimesheetEntry[];
  today: string;
}): string {
  const { actor, users, projects, members, tasks, timesheet, today } = params;

  const projectLines = projects.map((p) => {
    const role = members.find((m) => m.userId === actor.id && m.projectId === p.id)?.role ?? "?";
    const locked = p.lockedThrough ? `, locked through ${p.lockedThrough}` : "";
    return `- ${p.id} :: ${p.name} (ticket prefix ${p.ticketPrefix}) — ${actor.name} is ${role}${locked}`;
  });

  const memberLines = members.map((m) => {
    const user = users.find((u) => u.id === m.userId);
    const project = projects.find((p) => p.id === m.projectId);
    return `- ${user?.name ?? m.userId} (${m.userId}) is ${m.role} on ${project?.name ?? m.projectId}`;
  });

  const taskLines = tasks.map((t) => {
    const project = projects.find((p) => p.id === t.projectId);
    const assignee = t.assigneeId ? (users.find((u) => u.id === t.assigneeId)?.name ?? t.assigneeId) : "unassigned";
    return `- ${t.id} :: "${t.title}" [${t.status}] project=${project?.name ?? t.projectId} assignee=${assignee}`;
  });

  const pendingEntries = timesheet.filter((e) => e.status === "pending");
  const entryLines = pendingEntries.map((e) => `- ${e.id} :: ${entryLabel(e, users, projects)}`);

  return `You are the AI assistant inside Flowdesk, a task/timesheet platform. You act on behalf of ${actor.name} (id ${actor.id}). Today's date is ${today}.

Roles are project-scoped, never global — see the membership list below. You do not need to enforce permissions yourself: every tool call you make is only a *proposal*, and the app re-checks it server-side before saving anything, rejecting and explaining if ${actor.name} isn't allowed to do it. Your only job is translating their request into the right tool call(s), correctly.

Rules:
- Never claim you've already done something. Phrase replies as proposals ("About to log 4h on Project A"), not completed actions ("Logged 4h").
- Use only the exact ids given below — never invent one. If nothing matches what the user asked for, say so in plain text instead of calling a tool.
- For a request naming multiple tasks (e.g. "mark ENG-1 and ENG-2 done"), call update_task_status once per task in the same turn.
- reject_timesheet always needs a real reason. If the user didn't give one, ask for it in plain text instead of calling the tool with an empty reason.
- get_summary is read-only and needs no confirmation — call it directly for any "how's X doing" / "summarize" / "how many hours" question.
- Only use ask_clarifying_question when a reference is genuinely ambiguous even with the context below. Don't ask about things you can resolve yourself.
- Resolve relative dates ("today", "yesterday", "last month", "this week") against today's date above.

Projects:
${projectLines.join("\n") || "(none)"}

Project members:
${memberLines.join("\n") || "(none)"}

Tasks:
${taskLines.join("\n") || "(none)"}

Pending timesheet entries:
${entryLines.join("\n") || "(none)"}

All users:
${users.map((u) => `- ${u.id} :: ${u.name}`).join("\n")}`;
}

export async function POST(request: Request) {
  try {
    const actorId = await requireUserId();
    const body = await request.json();
    const message = String(body.message ?? "").trim();
    const historyInput = Array.isArray(body.history) ? body.history : [];
    if (!message) throw new Error("Empty message.");

    const history = historyInput
      .filter(
        (h: unknown): h is { role: "user" | "assistant"; content: string } =>
          !!h &&
          typeof h === "object" &&
          ((h as { role?: unknown }).role === "user" || (h as { role?: unknown }).role === "assistant") &&
          typeof (h as { content?: unknown }).content === "string"
      )
      .slice(-20);

    const supabase = createServiceClient();
    const { data: myMemberships, error: membershipsError } = await supabase
      .from("project_members")
      .select("*")
      .eq("user_id", actorId);
    if (membershipsError) throw membershipsError;
    const projectIds = (myMemberships ?? []).map((m) => m.project_id);

    const empty = { data: [] as never[], error: null };
    const [usersRes, projectsRes, membersRes, tasksRes, timesheetRes, currentRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      projectIds.length ? supabase.from("projects").select("*").in("id", projectIds) : Promise.resolve(empty),
      projectIds.length ? supabase.from("project_members").select("*").in("project_id", projectIds) : Promise.resolve(empty),
      projectIds.length ? supabase.from("tasks").select("*").in("project_id", projectIds) : Promise.resolve(empty),
      projectIds.length ? supabase.from("timesheet_entries").select("*").in("project_id", projectIds) : Promise.resolve(empty),
      supabase.from("profiles").select("*").eq("id", actorId).single(),
    ]);
    for (const res of [usersRes, projectsRes, membersRes, tasksRes, timesheetRes, currentRes]) {
      if (res.error) throw res.error;
    }

    const actor = toUser(currentRes.data!);
    const users = usersRes.data!.map(toUser);
    const projects = projectsRes.data!.map(toProject);
    const members = membersRes.data!.map(toProjectMember);
    const tasks = tasksRes.data!.map(toTask);
    const timesheet = timesheetRes.data!.map(toTimesheetEntry);

    const today = new Date().toISOString().slice(0, 10);
    const system = buildSystemPrompt({ actor, users, projects, members, tasks, timesheet, today });

    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system,
      tools,
      messages: [
        ...history.map((h: { role: "user" | "assistant"; content: string }) => ({ role: h.role, content: h.content })),
        { role: "user" as const, content: message },
      ],
    });

    const textParts = response.content.filter((b) => b.type === "text").map((b) => b.text);
    const toolUses = response.content.filter((b) => b.type === "tool_use");

    const clarifyCall = toolUses.find((t) => t.name === "ask_clarifying_question");
    if (clarifyCall) {
      const input = clarifyCall.input as { question: string; options: { label: string; value: string }[] };
      return NextResponse.json({ reply: input.question, clarify: { question: input.question, options: input.options ?? [] } });
    }

    const summaryCall = toolUses.find((t) => t.name === "get_summary");
    if (summaryCall) {
      const input = summaryCall.input as { targetUserId: string; rangeStart: string; rangeEnd: string; rangeLabel: string };
      const targetUser = users.find((u) => u.id === input.targetUserId);
      if (!targetUser) {
        return NextResponse.json({ reply: "I couldn't figure out whose work to summarize — could you name them?" });
      }
      if (!canQuerySummaryFor(members, actorId, targetUser.id)) {
        return NextResponse.json({
          reply: `You can only see summaries for people on projects you manage — you don't manage any project ${targetUser.name} is on.`,
        });
      }
      const summary = buildSummary({
        targetUser,
        rangeLabel: input.rangeLabel,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        tasks,
        timesheet,
        projects,
      });
      const reply =
        textParts.join("\n").trim() ||
        `${targetUser.name}'s summary for ${input.rangeLabel}: ${summary.totalHours}h logged, ${summary.tasksCompleted} tasks completed, ${summary.tasksInProgress} in progress.`;
      return NextResponse.json({ reply, summary });
    }

    const actions: ChatAction[] = [];
    const problems: string[] = [];
    for (const call of toolUses) {
      if (!MUTATION_TYPES.includes(call.name as ChatActionType)) continue;
      const action = buildAction(call.name as ChatActionType, call.input as Record<string, unknown>, { users, projects, tasks, timesheet });
      if (action) actions.push(action);
      else problems.push(`Couldn't resolve a "${call.name}" action against something that no longer matches.`);
    }

    const prefix = problems.length ? `${problems.join(" ")} ` : "";
    const reply =
      textParts.join("\n").trim() ||
      (actions.length
        ? `${prefix}About to:\n${actions.map((a) => `• ${a.label}`).join("\n")}`
        : prefix || "I'm not sure what you'd like me to do — could you rephrase?");

    return NextResponse.json({ reply, actions: actions.length ? actions : undefined });
  } catch (err) {
    return errorResponse(err);
  }
}
