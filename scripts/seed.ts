/**
 * One-off demo data seed. Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (never committed, never sent to the browser). Run with: npm run db:seed
 *
 * Creates the same demo dataset the mock backend used to ship with, but as
 * real Supabase Auth users + Postgres rows. Safe to re-run — it exits early
 * if profiles already exist instead of double-seeding.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = "flowdesk-demo-1";

const DEMO_USERS = [
  { email: "jordan@flowdesk.app", name: "Jordan", initials: "JO", avatar_color: "indigo" },
  { email: "yolanda@flowdesk.app", name: "Yolanda", initials: "YO", avatar_color: "sky" },
  { email: "sam@flowdesk.app", name: "Sam", initials: "SA", avatar_color: "rose" },
  { email: "priya@flowdesk.app", name: "Priya", initials: "PR", avatar_color: "amber" },
] as const;

async function main() {
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`profiles already has ${count} row(s) — skipping seed. Delete existing data first if you want to reseed.`);
    return;
  }

  console.log("Creating demo users…");
  const userIds: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name, initials: u.initials, avatar_color: u.avatar_color },
    });
    if (error || !data.user) throw new Error(`createUser(${u.email}): ${error?.message}`);
    userIds[u.email] = data.user.id;
  }
  const jordan = userIds["jordan@flowdesk.app"];
  const yolanda = userIds["yolanda@flowdesk.app"];
  const sam = userIds["sam@flowdesk.app"];
  const priya = userIds["priya@flowdesk.app"];

  console.log("Creating projects…");
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .insert([
      { name: "Project A", ticket_prefix: "ENG", next_ticket_number: 4 },
      { name: "Project B", ticket_prefix: "PROD", next_ticket_number: 3 },
      { name: "Project C", ticket_prefix: "OPS", next_ticket_number: 2 },
    ])
    .select();
  if (projectsError || !projects) throw new Error(`projects insert: ${projectsError?.message}`);
  const projectA = projects.find((p) => p.ticket_prefix === "ENG")!.id;
  const projectB = projects.find((p) => p.ticket_prefix === "PROD")!.id;
  const projectC = projects.find((p) => p.ticket_prefix === "OPS")!.id;

  console.log("Adding project members…");
  const { error: membersError } = await supabase.from("project_members").insert([
    { user_id: jordan, project_id: projectA, role: "developer" },
    { user_id: jordan, project_id: projectB, role: "manager" },
    { user_id: yolanda, project_id: projectA, role: "developer" },
    { user_id: yolanda, project_id: projectC, role: "developer" },
    { user_id: sam, project_id: projectA, role: "manager" },
    { user_id: sam, project_id: projectC, role: "developer" },
    { user_id: priya, project_id: projectB, role: "developer" },
    { user_id: priya, project_id: projectC, role: "manager" },
  ]);
  if (membersError) throw new Error(`project_members insert: ${membersError.message}`);

  console.log("Creating tasks…");
  const { error: tasksError } = await supabase.from("tasks").insert([
    {
      id: "ENG-1",
      title: "Fix login bug",
      description: "Session expires early on Safari. Repro: sign in, wait 2 minutes, reload.",
      status: "todo",
      priority: "medium",
      project_id: projectA,
      assignee_id: yolanda,
    },
    {
      id: "PROD-1",
      title: "Design review",
      description: "Walk through the updated checkout flow with design before build starts.",
      status: "todo",
      priority: "medium",
      project_id: projectB,
      assignee_id: null,
    },
    {
      id: "ENG-2",
      title: "API refactor",
      description: "Split the monolithic /reports endpoint into per-resource handlers.",
      status: "in_progress",
      priority: "high",
      project_id: projectA,
      assignee_id: sam,
    },
    {
      id: "PROD-2",
      title: "Write onboarding doc",
      description: "Draft the first-week checklist for new engineering hires.",
      status: "in_progress",
      priority: "low",
      project_id: projectB,
      assignee_id: priya,
    },
    {
      id: "ENG-3",
      title: "Setup CI pipeline",
      description: "GitHub Actions: lint, typecheck, test on every PR.",
      status: "done",
      priority: "low",
      project_id: projectA,
      assignee_id: yolanda,
    },
    {
      id: "OPS-1",
      title: "Update deployment docs",
      description: "Docs still reference the old staging URL.",
      status: "todo",
      priority: "low",
      project_id: projectC,
      assignee_id: sam,
    },
  ]);
  if (tasksError) throw new Error(`tasks insert: ${tasksError.message}`);

  console.log("Creating timesheet entries…");
  const { error: timesheetError } = await supabase.from("timesheet_entries").insert([
    { user_id: yolanda, project_id: projectA, task_id: "ENG-1", date: "2026-07-10", hours: 5, status: "pending" },
    { user_id: sam, project_id: projectA, task_id: "ENG-2", date: "2026-07-09", hours: 7, note: "sprint work", status: "pending" },
    { user_id: sam, project_id: projectC, task_id: null, date: "2026-07-10", hours: 4, status: "pending" },
    { user_id: priya, project_id: projectC, task_id: null, date: "2026-07-08", hours: 5, note: "design review", status: "pending" },
    { user_id: jordan, project_id: projectB, task_id: null, date: "2026-07-07", hours: 6, status: "approved" },
    {
      user_id: jordan,
      project_id: projectA,
      task_id: null,
      date: "2026-07-06",
      hours: 3,
      status: "rejected",
      rejection_reason: "Duplicate of the entry logged on the 5th.",
    },
    { user_id: priya, project_id: projectB, task_id: "PROD-2", date: "2026-07-11", hours: 3, note: "onboarding", status: "pending" },
  ]);
  if (timesheetError) throw new Error(`timesheet_entries insert: ${timesheetError.message}`);

  console.log(`\nDone. Demo login for any of: ${DEMO_USERS.map((u) => u.email).join(", ")}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
