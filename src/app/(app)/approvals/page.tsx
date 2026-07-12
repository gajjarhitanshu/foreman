"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { TimesheetTable } from "@/components/timesheet/timesheet-table";
import { MultiSelectFilter } from "@/components/board/multi-select-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { managedProjectIds } from "@/lib/permissions";
import type { TimesheetStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: TimesheetStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ApprovalsPage() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const timesheet = useAppStore((s) => s.timesheet);
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const members = useAppStore((s) => s.members);

  const managed = useMemo(() => (currentUser ? managedProjectIds(members, currentUser.id) : []), [members, currentUser]);

  useEffect(() => {
    if (currentUser && managed.length === 0) router.replace("/board");
  }, [currentUser, managed, router]);

  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(["pending"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const managedSet = useMemo(() => new Set(managed), [managed]);
  const managedProjects = projects.filter((p) => managedSet.has(p.id));
  const userOptions = useMemo(
    () => users.filter((u) => timesheet.some((e) => e.userId === u.id && managedSet.has(e.projectId))).map((u) => ({ value: u.id, label: u.name })),
    [users, timesheet, managedSet]
  );

  const filtered = useMemo(() => {
    return timesheet.filter((e) => {
      if (!managedSet.has(e.projectId)) return false;
      if (userFilter.length && !userFilter.includes(e.userId)) return false;
      if (projectFilter.length && !projectFilter.includes(e.projectId)) return false;
      if (statusFilter.length && !statusFilter.includes(e.status)) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [timesheet, managedSet, userFilter, projectFilter, statusFilter, dateFrom, dateTo]);

  if (!currentUser || managed.length === 0) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Approvals</h1>
      <p className="mt-1 text-sm text-muted-foreground">Timesheet entries across projects you manage.</p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <MultiSelectFilter label="User" options={userOptions} selected={userFilter} onChange={setUserFilter} />
        <MultiSelectFilter
          label="Project"
          options={managedProjects.map((p) => ({ value: p.id, label: p.name }))}
          selected={projectFilter}
          onChange={setProjectFilter}
        />
        <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 bg-card" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 bg-card" />
        </div>
      </div>

      <div className="mt-4">
        <TimesheetTable entries={filtered} users={users} projects={projects} tasks={tasks} showUser showActions />
      </div>
    </div>
  );
}
