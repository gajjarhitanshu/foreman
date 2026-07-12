"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/store/app-store";
import { avatarColorClasses } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";

export function TicketSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const openTaskDrawer = useAppStore((s) => s.openTaskDrawer);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tasks.slice(0, 8);
    return tasks
      .filter((t) => t.id.toLowerCase().includes(needle) || t.title.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [tasks, query]);

  function selectTask(taskId: string) {
    setOpen(false);
    setQuery("");
    openTaskDrawer(taskId);
    router.push("/board");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <button className="flex w-56 items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground" />
        }
      >
        <Search className="size-4" />
        Search tickets…
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ticket id or title…"
            className="bg-transparent"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            results.map((task) => {
              const assignee = task.assigneeId ? usersById.get(task.assigneeId) : null;
              return (
                <button
                  key={task.id}
                  onClick={() => selectTask(task.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="shrink-0 font-mono text-xs text-primary">{task.id}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">{projectsById.get(task.projectId)?.name}</span>
                  {assignee && (
                    <Avatar className="size-5 shrink-0">
                      <AvatarFallback className={cn("text-[9px]", avatarColorClasses[assignee.avatarColor])}>
                        {assignee.initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
