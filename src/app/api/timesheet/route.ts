import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTimesheetEntry } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canLogTime, isPeriodLocked } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const actorId = await requireUserId();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const taskId: string | null = body.taskId ?? null;
    const date = String(body.date ?? "");
    const hours = Number(body.hours);
    const note: string | undefined = body.note || undefined;
    if (!projectId) throw new Error("Project is required.");
    if (!date) throw new Error("Date is required.");
    if (!hours || hours <= 0) throw new Error("Enter hours greater than 0.");

    const supabase = createServiceClient();
    const { data: projectRow, error: projectErr } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (projectErr || !projectRow) throw new Error("That project doesn't exist.");

    const { data: memberRows, error: memberErr } = await supabase.from("project_members").select("*").eq("project_id", projectId);
    if (memberErr) throw memberErr;
    const members = memberRows.map(toProjectMember);

    if (!canLogTime(members, actorId, projectId)) {
      throw new Error("You're not a member of that project.");
    }
    if (isPeriodLocked({ lockedThrough: projectRow.locked_through }, date)) {
      throw new Error(`${projectRow.name}'s timesheet is locked through ${projectRow.locked_through} — that period has already been billed.`);
    }

    const { data, error } = await supabase
      .from("timesheet_entries")
      .insert({ user_id: actorId, project_id: projectId, task_id: taskId, date, hours, note, status: "pending" })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(toTimesheetEntry(data!));
  } catch (err) {
    return errorResponse(err);
  }
}
