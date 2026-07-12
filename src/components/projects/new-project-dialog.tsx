"use client";

import { useState, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
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
import { useAppStore } from "@/store/app-store";

function suggestPrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon" aria-label="New project" />}>
        <FolderPlus className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>You&apos;ll be added as manager. Every ticket in this project gets an id like PREFIX-1.</DialogDescription>
        </DialogHeader>
        {open && <NewProjectForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const createProject = useAppStore((s) => s.createProject);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!prefixTouched) setPrefix(suggestPrefix(value));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !prefix.trim()) return;
    setSaving(true);
    setError(null);
    const res = await createProject({ name: name.trim(), ticketPrefix: prefix.trim() });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create project.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Mobile App" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-prefix">Ticket prefix</Label>
        <Input
          id="project-prefix"
          value={prefix}
          onChange={(e) => {
            setPrefixTouched(true);
            setPrefix(e.target.value.toUpperCase());
          }}
          placeholder="MOB"
          maxLength={6}
          className="font-mono uppercase"
          required
        />
        <p className="text-xs text-muted-foreground">Tickets will be numbered {prefix.trim() || "PREFIX"}-1, {prefix.trim() || "PREFIX"}-2…</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={saving || !name.trim() || !prefix.trim()}>
          {saving ? "Creating…" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
