import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toProject, type ProjectRow } from "@/lib/supabase/mappers";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const actorId = await requireUserId();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const ticketPrefix = String(body.ticketPrefix ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!name) throw new Error("Project name is required.");
    if (!ticketPrefix) throw new Error("Ticket prefix is required.");

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .rpc("create_project", { p_name: name, p_ticket_prefix: ticketPrefix, p_creator_id: actorId })
      .single();
    if (error) {
      if (error.message.includes("already used")) throw new Error(error.message);
      throw error;
    }

    return NextResponse.json(toProject(data as ProjectRow));
  } catch (err) {
    return errorResponse(err);
  }
}
