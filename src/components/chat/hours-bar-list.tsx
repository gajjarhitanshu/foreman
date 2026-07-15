import { cn } from "@/lib/utils";
import type { HoursBreakdownRow } from "@/lib/types";

/**
 * Horizontal stacked-bar list: bar length encodes total hours (magnitude),
 * segment widths encode the approved/pending/rejected split within that
 * total ("invested" vs "wasted" — rejected hours were explicitly declined
 * by a manager). Mark specs follow the dataviz skill: thin bars, 4px
 * rounded data-end, square at the baseline, 2px surface gaps between
 * segments, a legend since this is always 2+ series.
 */
const SEGMENTS = [
  { key: "approvedHours", label: "Approved", swatch: "bg-chart-success" },
  { key: "pendingHours", label: "Pending", swatch: "bg-chart-warning" },
  { key: "rejectedHours", label: "Rejected", swatch: "bg-chart-danger" },
] as const;

export function HoursBarList({ rows, emptyLabel = "No hours in this range." }: { rows: HoursBreakdownRow[]; emptyLabel?: string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  const maxHours = Math.max(...rows.map((r) => r.hours), 1);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {SEGMENTS.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", seg.swatch)} />
            {seg.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const widthPct = row.hours > 0 ? (row.hours / maxHours) * 100 : 0;
          const visible = SEGMENTS.filter((seg) => row[seg.key] > 0);
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{row.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{row.hours}h</span>
              </div>
              <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 flex gap-[2px]" style={{ width: `${widthPct}%` }}>
                  {visible.map((seg, i) => (
                    <div
                      key={seg.key}
                      className={cn("h-full", seg.swatch, i === visible.length - 1 && "rounded-r-[4px]")}
                      style={{ width: `${(row[seg.key] / row.hours) * 100}%` }}
                      title={`${seg.label}: ${row[seg.key]}h`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
