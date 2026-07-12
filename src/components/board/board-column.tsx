"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus, User } from "@/lib/types";
import { TaskCard } from "@/components/board/task-card";
import { cn } from "@/lib/utils";

export function BoardColumn({
  status,
  title,
  tasks,
  usersById,
  canDragTask,
  isDimmed,
  onOpenTask,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  usersById: Map<string, User>;
  canDragTask: (task: Task) => boolean;
  isDimmed: (task: Task) => boolean;
  onOpenTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-2 rounded-xl bg-secondary/60 p-2 transition-colors duration-150",
          isOver && "bg-accent"
        )}
      >
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-text-tertiary">No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assignee={task.assigneeId ? usersById.get(task.assigneeId) ?? null : null}
            canDrag={canDragTask(task)}
            dimmed={isDimmed(task)}
            onOpen={() => onOpenTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}
