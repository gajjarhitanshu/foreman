"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/timesheet/status-badge";
import { RejectPopover } from "@/components/timesheet/reject-popover";
import { useAppStore } from "@/store/app-store";
import { avatarColorClasses } from "@/lib/avatar-colors";
import type { Project, Task, TimesheetEntry, User } from "@/lib/types";
import { toast } from "sonner";

export function TimesheetTable({
  entries,
  users,
  projects,
  tasks,
  showUser,
  showActions,
}: {
  entries: TimesheetEntry[];
  users: User[];
  projects: Project[];
  tasks: Task[];
  showUser: boolean;
  showActions: boolean;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const approveEntry = useAppStore((s) => s.approveEntry);
  const rejectEntry = useAppStore((s) => s.rejectEntry);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  if (entries.length === 0) {
    return <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">No entries.</p>;
  }

  async function handleApprove(entryId: string) {
    const res = await approveEntry(entryId);
    if (!res.ok) toast.error(res.error ?? "Couldn't approve that entry.");
  }
  async function handleReject(entryId: string, reason: string) {
    const res = await rejectEntry(entryId, reason);
    if (!res.ok) toast.error(res.error ?? "Couldn't reject that entry.");
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {showUser && <th className="px-3 py-2 font-medium">Who</th>}
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Task</th>
            <th className="px-3 py-2 text-right font-medium">Hours</th>
            <th className="px-3 py-2 font-medium">Note</th>
            <th className="px-3 py-2 font-medium">Status</th>
            {showActions && <th className="px-3 py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {[...entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((entry) => {
              const submitter = usersById.get(entry.userId);
              const isSelf = entry.userId === currentUser?.id;
              const canAct = showActions && entry.status === "pending" && !isSelf;
              return (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  {showUser && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-5">
                          <AvatarFallback className={submitter ? `text-[9px] ${avatarColorClasses[submitter.avatarColor]}` : "text-[9px]"}>
                            {submitter?.initials ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        {submitter?.name ?? "Unknown"}
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">{entry.date}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{projectsById.get(entry.projectId)?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.taskId ? tasksById.get(entry.taskId)?.title ?? "—" : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{entry.hours}h</td>
                  <td className="max-w-40 truncate px-3 py-2 text-muted-foreground" title={entry.note}>
                    {entry.note ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={entry.status} />
                    {entry.status === "rejected" && entry.rejectionReason && (
                      <p className="mt-0.5 max-w-40 text-xs text-muted-foreground" title={entry.rejectionReason}>
                        {entry.rejectionReason}
                      </p>
                    )}
                  </td>
                  {showActions && (
                    <td className="px-3 py-2">
                      {entry.status === "pending" ? (
                        <div
                          className="flex gap-1.5"
                          title={isSelf ? "You can't approve or reject your own entry" : undefined}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct}
                            className="border-success/40 text-success hover:bg-success/10 disabled:opacity-40"
                            onClick={() => handleApprove(entry.id)}
                          >
                            Approve
                          </Button>
                          {canAct ? (
                            <RejectPopover onReject={(reason) => handleReject(entry.id, reason)} />
                          ) : (
                            <Button size="sm" variant="outline" disabled className="border-danger/40 text-danger opacity-40">
                              Reject
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
