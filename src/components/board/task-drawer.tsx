"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusSegmented } from "@/components/board/status-segmented";
import { PrioritySegmented } from "@/components/board/priority-segmented";
import { useAppStore } from "@/store/app-store";
import { canAssignTask, canChangeTaskStatus, isProjectMember } from "@/lib/permissions";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export function TaskDrawer() {
  const taskDrawerId = useAppStore((s) => s.taskDrawerId);
  const closeTaskDrawer = useAppStore((s) => s.closeTaskDrawer);

  return (
    <DialogPrimitive.Root open={!!taskDrawerId} onOpenChange={(open) => !open && closeTaskDrawer()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/10 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-md outline-none duration-250 data-open:animate-in data-open:slide-in-from-right-12 data-closed:animate-out data-closed:slide-out-to-right-12">
          {taskDrawerId && <DrawerContent key={taskDrawerId} taskId={taskDrawerId} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DrawerContent({ taskId }: { taskId: string }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const members = useAppStore((s) => s.members);
  const projects = useAppStore((s) => s.projects);
  const updateTaskFields = useAppStore((s) => s.updateTaskFields);
  const moveTask = useAppStore((s) => s.moveTask);
  const assignTask = useAppStore((s) => s.assignTask);

  const task = tasks.find((t) => t.id === taskId);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!task || !currentUser) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const projectMembers = users.filter((u) => isProjectMember(members, u.id, task.projectId));
  const assignee = task.assigneeId ? users.find((u) => u.id === task.assigneeId) : null;
  const canEditStatus = canChangeTaskStatus(members, currentUser.id, task);
  const canEditAssignee = canAssignTask(members, currentUser.id, task.projectId);

  async function saveTitle() {
    if (!task || title.trim() === task.title) return;
    const res = await updateTaskFields(task.id, { title: title.trim() || task.title });
    if (!res.ok) setError(res.error ?? "Could not save.");
  }
  async function saveDescription() {
    if (!task || description === task.description) return;
    const res = await updateTaskFields(task.id, { description });
    if (!res.ok) setError(res.error ?? "Could not save.");
  }
  async function onStatusChange(status: TaskStatus) {
    if (!task) return;
    const res = await moveTask(task.id, status);
    if (!res.ok) setError(res.error ?? "Could not update status.");
  }
  async function onPriorityChange(priority: TaskPriority) {
    if (!task) return;
    const res = await updateTaskFields(task.id, { priority });
    if (!res.ok) setError(res.error ?? "Could not update priority.");
  }
  async function onAssigneeChange(value: string) {
    if (!task) return;
    const res = await assignTask(task.id, value === "unassigned" ? null : value);
    if (!res.ok) setError(res.error ?? "Could not assign.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs font-medium text-text-tertiary">
          {project?.name ?? "Unknown project"} · {task.id}
        </span>
        <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
          <XIcon />
        </DialogPrimitive.Close>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          rows={1}
          className="w-full resize-none bg-transparent text-lg font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        />

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            placeholder="Add a description…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <StatusSegmented value={task.status} onChange={onStatusChange} disabled={!canEditStatus} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          {canEditAssignee ? (
            <Select value={task.assigneeId ?? "unassigned"} onValueChange={(v) => v && onAssigneeChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned">
                  {(value: string | null) =>
                    value === "unassigned" || !value ? "Unassigned" : projectMembers.find((u) => u.id === value)?.name ?? "Unassigned"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {projectMembers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground" title="Only a manager on this project can reassign tasks">
              {assignee?.name ?? "Unassigned"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <PrioritySegmented value={task.priority} onChange={onPriorityChange} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="border-t border-border px-5 py-3 text-xs text-text-tertiary">
        Last updated {format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}
      </div>
    </div>
  );
}
