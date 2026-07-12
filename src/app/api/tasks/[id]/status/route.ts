import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTask } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canChangeTaskStatus } from "@/lib/permissions";
import type { TaskStatus } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await requireUserId();
    const { id } = await params;
    const body = await request.json();
    const status = body.status as TaskStatus;

    const supabase = createServiceClient();
    const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (taskErr || !taskRow) throw new Error("Task not found");

    const { data: memberRows, error: memberErr } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", taskRow.project_id);
    if (memberErr) throw memberErr;
    const members = memberRows.map(toProjectMember);

    const task = toTask(taskRow);
    if (!canChangeTaskStatus(members, actorId, task)) {
      throw new Error("Only the assignee or a manager on this project can change this task's status.");
    }

    const { data, error } = await supabase.from("tasks").update({ status }).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json(toTask(data!));
  } catch (err) {
    return errorResponse(err);
  }
}
