import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTask } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canAssignTask, isProjectMember } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await requireUserId();
    const { id } = await params;
    const body = await request.json();
    const assigneeId: string | null = body.assigneeId ?? null;

    const supabase = createServiceClient();
    const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (taskErr || !taskRow) throw new Error("Task not found");

    const { data: memberRows, error: memberErr } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", taskRow.project_id);
    if (memberErr) throw memberErr;
    const members = memberRows.map(toProjectMember);

    if (!canAssignTask(members, actorId, taskRow.project_id)) {
      throw new Error("Only a manager on this project can assign tasks.");
    }
    if (assigneeId && !isProjectMember(members, assigneeId, taskRow.project_id)) {
      throw new Error("That person isn't a member of this project yet — add them to the project first.");
    }

    const { data, error } = await supabase.from("tasks").update({ assignee_id: assigneeId }).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json(toTask(data!));
  } catch (err) {
    return errorResponse(err);
  }
}
