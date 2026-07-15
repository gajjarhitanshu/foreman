"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { HoursBarList } from "@/components/chat/hours-bar-list";
import { PieChart, statusPieSegments, distributionPieSegments } from "@/components/chat/pie-chart";
import type { ChatSummary } from "@/lib/types";

export function SummaryCard({ messageId, summary }: { messageId: string; summary: ChatSummary }) {
  const exportSummaryReport = useAppStore((s) => s.exportSummaryReport);

  return (
    <div className="rounded-xl border bg-card p-3.5 text-sm shadow-sm">
      <p className="font-medium text-foreground">
        {summary.userName} · {summary.rangeLabel}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Hours logged" value={`${summary.totalHours}h`} />
        <Stat label="Tasks completed" value={summary.tasksCompleted} />
        <Stat label="Tasks in progress" value={summary.tasksInProgress} />
        <Stat label="Pending hours" value={`${summary.pendingHours}h`} tone={summary.pendingHours > 0 ? "warning" : undefined} />
      </div>

      <div className="mt-3 border-t border-border pt-2.5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Hours by project — invested vs. wasted</p>
        <HoursBarList rows={summary.byProject} emptyLabel="No hours logged in this range." />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-2.5 sm:grid-cols-2">
        <PieChart title="Approved vs. pending vs. rejected" segments={statusPieSegments(summary)} />
        <PieChart title="Distribution by project" segments={distributionPieSegments(summary.byProject)} />
      </div>

      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => void exportSummaryReport(messageId)}>
        <Download className="size-3.5" />
        Export as Excel
      </Button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warning" }) {
  return (
    <div>
      <p className={tone === "warning" ? "text-lg font-semibold text-warning" : "text-lg font-semibold text-foreground"}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
