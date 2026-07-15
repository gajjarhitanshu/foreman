"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { HoursBarList } from "@/components/chat/hours-bar-list";
import { PieChart, statusPieSegments, distributionPieSegments } from "@/components/chat/pie-chart";
import type { TeamSummary } from "@/lib/types";

export function TeamSummaryCard({ messageId, teamSummary }: { messageId: string; teamSummary: TeamSummary }) {
  const exportTeamSummaryReport = useAppStore((s) => s.exportTeamSummaryReport);

  return (
    <div className="rounded-xl border bg-card p-3.5 text-sm shadow-sm">
      <p className="font-medium text-foreground">
        {teamSummary.scopeLabel} · {teamSummary.rangeLabel}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total hours" value={`${teamSummary.totalHours}h`} />
        <Stat label="Approved" value={`${teamSummary.approvedHours}h`} tone="success" />
        <Stat label="Pending" value={`${teamSummary.pendingHours}h`} tone="warning" />
        <Stat label="Rejected (wasted)" value={`${teamSummary.rejectedHours}h`} tone="danger" />
      </div>

      <div className="mt-3 border-t border-border pt-2.5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Hours by project</p>
        <HoursBarList rows={teamSummary.byProject} emptyLabel="No hours logged in this range." />
      </div>

      <div className="mt-3 border-t border-border pt-2.5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Hours by person</p>
        <HoursBarList rows={teamSummary.byMember} emptyLabel="No hours logged in this range." />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-2.5 sm:grid-cols-2">
        <PieChart title="Approved vs. pending vs. rejected" segments={statusPieSegments(teamSummary)} />
        <PieChart title="Distribution by project" segments={distributionPieSegments(teamSummary.byProject)} />
      </div>
      <div className="mt-3 border-t border-border pt-2.5">
        <PieChart title="Distribution by person" segments={distributionPieSegments(teamSummary.byMember)} />
      </div>

      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => void exportTeamSummaryReport(messageId)}>
        <Download className="size-3.5" />
        Export as Excel
      </Button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
