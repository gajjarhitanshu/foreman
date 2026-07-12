import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTask } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { isProjectMember } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await requireUserId();
    const { id } = await params;
    const body = await request.json();

    const supabase = createServiceClient();
    const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (taskErr || !taskRow) throw new Error("Task not found");

    const { data: memberRows, error: memberErr } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", taskRow.project_id);
    if (memberErr) throw memberErr;
    const members = memberRows.map(toProjectMember);

    if (!isProjectMember(members, actorId, taskRow.project_id)) {
      throw new Error("You're not a member of this task's project.");
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.priority === "string") patch.priority = body.priority;

    const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json(toTask(data!));
  } catch (err) {
    return errorResponse(err);
  }
}
