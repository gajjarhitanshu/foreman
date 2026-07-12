"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SlidingTab {
  value: string;
  label: string;
  badge?: number;
}

export function SlidingTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: SlidingTab[];
  value: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const el = container.querySelector<HTMLElement>(`[data-tab-value="${value}"]`);
      if (!el) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, tabs]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-0.5 rounded-full bg-secondary p-1">
      {indicator && (
        <div
          className="absolute top-1 bottom-1 rounded-full bg-card shadow-sm transition-[left,width] duration-250 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          data-tab-value={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
            value === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {typeof tab.badge === "number" && tab.badge > 0 && (
            <span className="flex size-4.5 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
