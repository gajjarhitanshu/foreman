import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProjectMember, toTimesheetEntry } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";
import { canApproveEntry } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await requireUserId();
    const { id } = await params;
    const body = await request.json();
    const reason = String(body.reason ?? "").trim();
    if (!reason) throw new Error("A rejection reason is required.");

    const supabase = createServiceClient();
    const { data: entryRow, error: entryErr } = await supabase.from("timesheet_entries").select("*").eq("id", id).single();
    if (entryErr || !entryRow) throw new Error("Timesheet entry not found");

    const { data: memberRows, error: memberErr } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", entryRow.project_id);
    if (memberErr) throw memberErr;
    const members = memberRows.map(toProjectMember);

    const entry = toTimesheetEntry(entryRow);
    if (!canApproveEntry(members, actorId, entry)) {
      throw new Error(
        entry.userId === actorId ? "You can't reject your own timesheet entry." : "Only a manager on this project can reject entries."
      );
    }

    const { data, error } = await supabase
      .from("timesheet_entries")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(toTimesheetEntry(data!));
  } catch (err) {
    return errorResponse(err);
  }
}
