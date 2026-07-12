"use client";

import { useAppStore } from "@/store/app-store";
import { EntryForm } from "@/components/timesheet/entry-form";
import { TimesheetTable } from "@/components/timesheet/timesheet-table";

export default function TimesheetPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const timesheet = useAppStore((s) => s.timesheet);
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);

  const myEntries = timesheet.filter((e) => e.userId === currentUser?.id);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Timesheet</h1>

      <div className="mt-4">
        <EntryForm />
      </div>

      <div className="mt-4">
        <TimesheetTable entries={myEntries} users={users} projects={projects} tasks={tasks} showUser={false} showActions={false} />
      </div>
    </div>
  );
}
