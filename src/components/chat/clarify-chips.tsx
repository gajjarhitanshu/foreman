"use client";

import { useAppStore } from "@/store/app-store";
import type { ChatClarifyOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClarifyChips({
  messageId,
  options,
  resolved,
}: {
  messageId: string;
  options: ChatClarifyOption[];
  resolved?: string;
}) {
  const resolveClarify = useAppStore((s) => s.resolveClarify);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={!!resolved}
          onClick={() => resolveClarify(messageId, opt.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
            resolved === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
