"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task, User } from "@/lib/types";
import { avatarColorClasses, priorityDotClasses, priorityLabel } from "@/lib/avatar-colors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TaskCard({
  task,
  assignee,
  canDrag,
  dimmed,
  onOpen,
}: {
  task: Task;
  assignee: User | null;
  canDrag: boolean;
  dimmed: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...attributes}
      onClick={onOpen}
      style={{ transform: CSS.Translate.toString(transform) }}
      title={canDrag ? undefined : "Only the assignee or a manager on this project can move this task"}
      className={cn(
        "touch-none rounded-xl border border-border bg-card p-3 shadow-sm transition-[box-shadow,opacity] duration-150",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:shadow-md",
        isDragging && "opacity-50 shadow-md",
        dimmed && "opacity-40"
      )}
    >
      <p className="font-mono text-xs text-primary">{task.id}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{task.title}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <span
          title={priorityLabel[task.priority]}
          className={cn("size-2 rounded-full", priorityDotClasses[task.priority])}
        />
        {assignee ? (
          <Avatar className="size-6">
            <AvatarFallback className={cn("text-[10px]", avatarColorClasses[assignee.avatarColor])}>
              {assignee.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="size-6 rounded-full border border-dashed border-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}
