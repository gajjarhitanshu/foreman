import { cn } from "@/lib/utils";
import type { HoursBreakdownRow } from "@/lib/types";

/**
 * Fixed-order categorical slots (dataviz skill: never cycle, never reassign).
 * Capped at 6 — beyond that, remaining rows fold into "Other" per the
 * part-to-whole rule (pie/donut is legible only up to ~6 segments).
 *
 * Each slot carries both a CSS var reference (for the live, theme-aware DOM
 * chart) and a resolved light-mode hex (for the standalone SVG rendered into
 * the XLSX export, which lives outside the page's CSS cascade).
 */
const CATEGORICAL_SLOTS = [
  { swatch: "bg-chart-cat-1", fill: "var(--color-chart-cat-1)", hex: "#2a78d6" },
  { swatch: "bg-chart-cat-2", fill: "var(--color-chart-cat-2)", hex: "#008300" },
  { swatch: "bg-chart-cat-3", fill: "var(--color-chart-cat-3)", hex: "#e87ba4" },
  { swatch: "bg-chart-cat-4", fill: "var(--color-chart-cat-4)", hex: "#eda100" },
  { swatch: "bg-chart-cat-5", fill: "var(--color-chart-cat-5)", hex: "#1baf7a" },
  { swatch: "bg-chart-cat-6", fill: "var(--color-chart-cat-6)", hex: "#eb6834" },
] as const;
const CATEGORICAL_OTHER = { swatch: "bg-chart-cat-other", fill: "var(--color-chart-cat-other)", hex: "#9a988f" };

export interface PieSegment {
  key: string;
  label: string;
  value: number;
  swatch: string;
  /** CSS var reference — used by the live, theme-aware DOM chart. */
  fill: string;
  /** Resolved light-mode hex — used by the standalone SVG rendered for export. */
  hex: string;
}

/** Approved/pending/rejected split, using the same status colors as the bar list. */
export function statusPieSegments(overall: { approvedHours: number; pendingHours: number; rejectedHours: number }): PieSegment[] {
  return [
    { key: "approved", label: "Approved", value: overall.approvedHours, swatch: "bg-chart-success", fill: "var(--color-chart-success)", hex: "#16a34a" },
    { key: "pending", label: "Pending", value: overall.pendingHours, swatch: "bg-chart-warning", fill: "var(--color-chart-warning)", hex: "#d97706" },
    { key: "rejected", label: "Rejected", value: overall.rejectedHours, swatch: "bg-chart-danger", fill: "var(--color-chart-danger)", hex: "#dc2626" },
  ].filter((s) => s.value > 0);
}

/** Distribution across rows (by project or by member), top 6 by hours + an "Other" fold. */
export function distributionPieSegments(rows: HoursBreakdownRow[]): PieSegment[] {
  const sorted = [...rows].filter((r) => r.hours > 0).sort((a, b) => b.hours - a.hours);
  const head: PieSegment[] = sorted.slice(0, 6).map((row, i) => ({
    key: row.key,
    label: row.label,
    value: row.hours,
    ...CATEGORICAL_SLOTS[i],
  }));
  const rest = sorted.slice(6);
  if (rest.length > 0) {
    head.push({
      key: "other",
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, r) => sum + r.hours, 0),
      ...CATEGORICAL_OTHER,
    });
  }
  return head;
}

const SIZE = 112;
const RADIUS = 40;
const STROKE = 13;

interface Arc extends PieSegment {
  fraction: number;
  dasharray: string;
  dashoffset: number;
}

/** Shared donut arc math — feeds both the live DOM chart and the static export SVG. */
function computeArcs(segments: PieSegment[], total: number, size: number): Arc[] {
  const gap = (2 / size) * 100; // ~2px rendered gap between segments, in viewBox units
  const circumference = (2 * Math.PI * RADIUS * size) / SIZE;
  return segments.reduce<{ offset: number; items: Arc[] }>(
    (acc, s) => {
      const fraction = s.value / total;
      const rawLen = fraction * circumference;
      const visibleLen = Math.max(rawLen - gap, 0.001);
      const dashoffset = -acc.offset;
      return {
        offset: acc.offset + rawLen,
        items: [...acc.items, { ...s, fraction, dasharray: `${visibleLen} ${circumference - visibleLen}`, dashoffset }],
      };
    },
    { offset: 0, items: [] },
  ).items;
}

export function PieChart({ title, segments, emptyLabel = "No hours in this range." }: { title: string; segments: PieSegment[]; emptyLabel?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const arcs = computeArcs(segments, total, SIZE);

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" role="img" aria-label={`${title}: ${total} total`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.fill}
                strokeWidth={STROKE}
                strokeDasharray={arc.dasharray}
                strokeDashoffset={arc.dashoffset}
              >
                <title>{`${arc.label}: ${arc.value}h (${Math.round(arc.fraction * 100)}%)`}</title>
              </circle>
            ))}
          </g>
          <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
            {total}h
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">
            total
          </text>
        </svg>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", s.swatch)} />
                <span className="truncate text-foreground">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {s.value}h · {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone SVG markup for the same chart, rendered outside the page DOM
 * (used to rasterize a PNG for the XLSX export) — so it can't rely on CSS
 * custom properties or Tailwind classes and uses resolved hex directly.
 */
const EXPORT_CHART_SIZE = 160;
const EXPORT_LEGEND_ROW_H = 20;
const EXPORT_PADDING = 16;

export function pieChartSvgMarkup(title: string, segments: PieSegment[]): { markup: string; width: number; height: number } {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const width = EXPORT_PADDING * 3 + EXPORT_CHART_SIZE + 170;
  const height = Math.max(EXPORT_CHART_SIZE, segments.length * EXPORT_LEGEND_ROW_H) + EXPORT_PADDING * 2 + 28;

  if (total === 0) {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="80" viewBox="0 0 ${width} 80" font-family="system-ui, -apple-system, sans-serif">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${EXPORT_PADDING}" y="24" font-size="14" font-weight="600" fill="#16181d">${escapeXml(title)}</text>
      <text x="${EXPORT_PADDING}" y="48" font-size="12" fill="#8a8e98">No hours in this range.</text>
    </svg>`;
    return { markup, width, height: 80 };
  }

  const cx = EXPORT_PADDING + EXPORT_CHART_SIZE / 2;
  const cy = EXPORT_PADDING + 28 + EXPORT_CHART_SIZE / 2;
  const arcs = computeArcs(segments, total, EXPORT_CHART_SIZE);
  const arcCircles = arcs
    .map(
      (arc) =>
        `<circle cx="${cx}" cy="${cy}" r="${RADIUS * (EXPORT_CHART_SIZE / SIZE)}" fill="none" stroke="${arc.hex}" stroke-width="${STROKE * (EXPORT_CHART_SIZE / SIZE)}" stroke-dasharray="${arc.dasharray}" stroke-dashoffset="${arc.dashoffset}" transform="rotate(-90 ${cx} ${cy})" />`,
    )
    .join("");

  const legendX = EXPORT_PADDING * 2 + EXPORT_CHART_SIZE;
  const legendRows = segments
    .map((s, i) => {
      const y = EXPORT_PADDING + 28 + i * EXPORT_LEGEND_ROW_H + 12;
      const pct = Math.round((s.value / total) * 100);
      return `<rect x="${legendX}" y="${y - 9}" width="8" height="8" rx="2" fill="${s.hex}" />
        <text x="${legendX + 14}" y="${y}" font-size="11" fill="#16181d">${escapeXml(s.label)}</text>
        <text x="${legendX + 150}" y="${y}" font-size="11" fill="#5c606a" text-anchor="end">${s.value}h · ${pct}%</text>`;
    })
    .join("");

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, -apple-system, sans-serif">
    <rect width="100%" height="100%" fill="#ffffff" />
    <text x="${EXPORT_PADDING}" y="24" font-size="14" font-weight="600" fill="#16181d">${escapeXml(title)}</text>
    <circle cx="${cx}" cy="${cy}" r="${RADIUS * (EXPORT_CHART_SIZE / SIZE)}" fill="none" stroke="#e4e5e8" stroke-width="${STROKE * (EXPORT_CHART_SIZE / SIZE)}" />
    ${arcCircles}
    <text x="${cx}" y="${cy - 4}" font-size="18" font-weight="600" fill="#16181d" text-anchor="middle">${total}h</text>
    <text x="${cx}" y="${cy + 13}" font-size="10" fill="#8a8e98" text-anchor="middle">total</text>
    ${legendRows}
  </svg>`;

  return { markup, width, height };
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}
