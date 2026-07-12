import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTask, type TaskRow } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canCreateTask, isProjectMember } from "@/lib/permissions";
import type { TaskPriority } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const actorId = await requireUserId();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priority = (body.priority ?? "medium") as TaskPriority;
    const assigneeId: string | null = body.assigneeId ?? null;
    if (!title) throw new Error("Title is required.");
    if (!projectId) throw new Error("Project is required.");

    const supabase = createServiceClient();
    const { data: memberRows, error: memberErr } = await supabase.from("project_members").select("*").eq("project_id", projectId);
    if (memberErr) throw memberErr;
    const members = (memberRows ?? []).map(toProjectMember);

    if (!canCreateTask(members, actorId, projectId)) {
      throw new Error("You're not a member of that project.");
    }
    if (assigneeId && !isProjectMember(members, assigneeId, projectId)) {
      throw new Error("That person isn't a member of this project yet — add them to the project first.");
    }

    const { data, error } = await supabase
      .rpc("create_task", {
        p_project_id: projectId,
        p_title: title,
        p_description: description,
        p_priority: priority,
        p_assignee_id: assigneeId,
      })
      .single();
    if (error) throw error;

    return NextResponse.json(toTask(data as TaskRow));
  } catch (err) {
    return errorResponse(err);
  }
}
