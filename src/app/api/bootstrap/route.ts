import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toUser, toProject, toProjectMember, toTask, toTimesheetEntry } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const actorId = await requireUserId();
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

    return NextResponse.json({
      currentUser: toUser(currentRes.data!),
      users: usersRes.data!.map(toUser),
      projects: projectsRes.data!.map(toProject),
      members: membersRes.data!.map(toProjectMember),
      tasks: tasksRes.data!.map(toTask),
      timesheet: timesheetRes.data!.map(toTimesheetEntry),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
