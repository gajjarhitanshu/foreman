"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { ChatSummary } from "@/lib/types";

export function SummaryCard({ messageId, summary }: { messageId: string; summary: ChatSummary }) {
  const exportSummaryCsv = useAppStore((s) => s.exportSummaryCsv);

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

      {summary.byProject.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border pt-2.5">
          {summary.byProject.map((row) => (
            <div key={row.projectId} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{row.projectName}</span>
              <span className="tabular-nums text-muted-foreground">{row.hours}h</span>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => exportSummaryCsv(messageId)}>
        <Download className="size-3.5" />
        Export as CSV
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
