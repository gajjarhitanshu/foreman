"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import { format } from "date-fns";

export function EntryForm() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const logHours = useAppStore((s) => s.logHours);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [taskId, setTaskId] = useState<string>("none");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState(1);
  const [note, setNote] = useState("");
  const [noteFocused, setNoteFocused] = useState(false);
  const [errors, setErrors] = useState<{ project?: string; hours?: string }>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === projectId), [tasks, projectId]);

  function adjustHours(delta: number) {
    setHours((h) => Math.max(0.25, Math.round((h + delta) * 4) / 4));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!projectId) nextErrors.project = "Pick a project.";
    if (!hours || hours <= 0) nextErrors.hours = "Enter hours greater than 0.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setServerError(null);
    const res = await logHours({
      projectId,
      taskId: taskId === "none" ? null : taskId,
      date,
      hours,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.error ?? "Could not log hours.");
      return;
    }
    setNote("");
    setHours(1);
    setTaskId("none");
  }

  if (projects.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        You&apos;re not a member of any project yet, so there&apos;s nowhere to log time against.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Project</span>
          <Select
            value={projectId}
            onValueChange={(v) => {
              if (v) {
                setProjectId(v);
                setTaskId("none");
              }
            }}
          >
            <SelectTrigger className="w-40">
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
          {errors.project && <span className="text-xs text-danger">{errors.project}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Task (optional)</span>
          <Select value={taskId} onValueChange={(v) => v && setTaskId(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="No task">
                {(value: string | null) => (value === "none" || !value ? "No task" : projectTasks.find((t) => t.id === value)?.title ?? "No task")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No task</SelectItem>
              {projectTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Hours</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon-sm" onClick={() => adjustHours(-0.25)} aria-label="Decrease hours">
              <Minus className="size-3" />
            </Button>
            <Input
              type="number"
              step={0.25}
              min={0.25}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-16 text-center"
            />
            <Button type="button" variant="outline" size="icon-sm" onClick={() => adjustHours(0.25)} aria-label="Increase hours">
              <Plus className="size-3" />
            </Button>
          </div>
          {errors.hours && <span className="text-xs text-danger">{errors.hours}</span>}
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Note</span>
          {noteFocused ? (
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} autoFocus placeholder="Optional" />
          ) : (
            <Input value={note} onChange={(e) => setNote(e.target.value)} onFocus={() => setNoteFocused(true)} placeholder="Optional" />
          )}
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Logging…" : "Log hours"}
        </Button>
      </div>
      {serverError && <p className="mt-2 text-xs text-danger">{serverError}</p>}
    </form>
  );
}
