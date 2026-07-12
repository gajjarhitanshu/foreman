import { Check, Clock, X } from "lucide-react";
import type { TimesheetStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<TimesheetStatus, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", icon: Check, className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", icon: X, className: "bg-danger/10 text-danger" },
};

export function StatusBadge({ status }: { status: TimesheetStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}
