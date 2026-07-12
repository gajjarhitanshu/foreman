"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useAppStore } from "@/store/app-store";
import { BoardColumn } from "@/components/board/board-column";
import { CreateTaskDialog } from "@/components/board/create-task-dialog";
import { TaskDrawer } from "@/components/board/task-drawer";
import { MultiSelectFilter } from "@/components/board/multi-select-filter";
import { canChangeTaskStatus, isProjectMember, managedProjectIds } from "@/lib/permissions";
import type { Task, TaskStatus } from "@/lib/types";

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

export default function BoardPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const members = useAppStore((s) => s.members);
  const moveTask = useAppStore((s) => s.moveTask);
  const openTaskDrawer = useAppStore((s) => s.openTaskDrawer);

  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const managed = useMemo(() => (currentUser ? managedProjectIds(members, currentUser.id) : []), [members, currentUser]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const assigneeOptions = useMemo(
    () =>
      users
        .filter((u) => projects.some((p) => isProjectMember(members, u.id, p.id)))
        .map((u) => ({ value: u.id, label: u.name })),
    [users, projects, members]
  );

  const scopedByOtherFilters = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter.length && !projectFilter.includes(t.projectId)) return false;
      if (assigneeFilter.length && !(t.assigneeId && assigneeFilter.includes(t.assigneeId))) return false;
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter]);

  function isDimmed(task: Task) {
    return statusFilter.length > 0 && !statusFilter.includes(task.status);
  }

  function canDragTask(task: Task) {
    return currentUser ? canChangeTaskStatus(members, currentUser.id, task) : false;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const nextStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== nextStatus) {
      const res = await moveTask(task.id, nextStatus);
      if (!res.ok) toast.error(res.error ?? "Couldn't move that task.");
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Board</h1>
        <CreateTaskDialog defaultProjectId={projectFilter[0]} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <MultiSelectFilter label="Assignee" options={assigneeOptions} selected={assigneeFilter} onChange={setAssigneeFilter} />
        <MultiSelectFilter
          label="Status"
          options={COLUMNS.map((c) => ({ value: c.status, label: c.title }))}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        {managed.length >= 2 && (
          <MultiSelectFilter
            label="Project"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            selected={projectFilter}
            onChange={setProjectFilter}
          />
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          No tasks yet — you&apos;re not a member of a project with any tasks.
        </div>
      ) : (
        <div className="mt-4 flex-1 overflow-x-auto">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4 pb-4 max-[959px]:snap-x max-[959px]:snap-mandatory max-[959px]:overflow-x-auto">
              {COLUMNS.map((col) => (
                <div key={col.status} className="max-[959px]:snap-start">
                  <BoardColumn
                    status={col.status}
                    title={col.title}
                    tasks={scopedByOtherFilters.filter((t) => t.status === col.status)}
                    usersById={usersById}
                    canDragTask={canDragTask}
                    isDimmed={isDimmed}
                    onOpenTask={openTaskDrawer}
                  />
                </div>
              ))}
            </div>
          </DndContext>
        </div>
      )}

      <TaskDrawer />
    </div>
  );
}
