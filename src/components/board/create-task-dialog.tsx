"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrioritySegmented } from "@/components/board/priority-segmented";
import { useAppStore } from "@/store/app-store";
import type { Project, TaskPriority } from "@/lib/types";
import { isProjectMember } from "@/lib/permissions";

export function CreateTaskDialog({ defaultProjectId }: { defaultProjectId?: string }) {
  const [open, setOpen] = useState(false);
  const projects = useAppStore((s) => s.projects);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        New task
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Tasks always belong to a project.</DialogDescription>
        </DialogHeader>
        {open && (
          <CreateTaskForm projects={projects} defaultProjectId={defaultProjectId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskForm({
  projects,
  defaultProjectId,
  onDone,
}: {
  projects: Project[];
  defaultProjectId?: string;
  onDone: () => void;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const members = useAppStore((s) => s.members);
  const createTask = useAppStore((s) => s.createTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projectMembers = users.filter((u) => isProjectMember(members, u.id, projectId));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSaving(true);
    setError(null);
    const res = await createTask({
      title: title.trim(),
      description: description.trim(),
      projectId,
      priority,
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create task.");
      return;
    }
    onDone();
  }

  if (!currentUser) return null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fix login bug" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Project</Label>
          <Select
            value={projectId}
            onValueChange={(v) => {
              if (v) {
                setProjectId(v);
                setAssigneeId("unassigned");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Project">
                {(value: string | null) => projects.find((p) => p.id === value)?.name ?? "Select"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Assignee</Label>
          <Select value={assigneeId} onValueChange={(v) => v && setAssigneeId(v)}>
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
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Priority</Label>
        <PrioritySegmented value={priority} onChange={setPriority} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? "Creating…" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
