"use client";

import { Check, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { ChatAction, ChatActionResult, ChatTurnStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConfirmationCard({
  messageId,
  actions,
  turnStatus,
  results,
}: {
  messageId: string;
  actions: ChatAction[];
  turnStatus?: ChatTurnStatus;
  results?: ChatActionResult[];
}) {
  const resolveChatTurn = useAppStore((s) => s.resolveChatTurn);
  const openTaskDrawer = useAppStore((s) => s.openTaskDrawer);

  const pending = turnStatus === "pending" || !turnStatus;

  return (
    <div
      role={pending ? "alert" : undefined}
      className={cn(
        "rounded-xl border-2 bg-card p-3 text-sm shadow-sm",
        pending && "border-primary",
        turnStatus === "confirmed" && "border-success",
        turnStatus === "cancelled" && "border-border"
      )}
    >
      <ul className="space-y-1">
        {actions.map((action) => {
          const result = results?.find((r) => r.actionId === action.id);
          return (
            <li key={action.id} className="flex items-start gap-1.5">
              {result ? (
                result.ok ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                ) : (
                  <X className="mt-0.5 size-3.5 shrink-0 text-danger" />
                )
              ) : (
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              )}
              <span className="text-foreground">
                {action.label}
                {result && (
                  <>
                    {" — "}
                    <span className={result.ok ? "text-success" : "text-danger"}>{result.message}</span>
                    {result.ok && result.recordType === "task" && result.recordId && (
                      <button
                        type="button"
                        onClick={() => openTaskDrawer(result.recordId!)}
                        className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        View task <ArrowUpRight className="size-3" />
                      </button>
                    )}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {pending && (
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" onClick={() => resolveChatTurn(messageId, true)}>
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => resolveChatTurn(messageId, false)}>
            Cancel
          </Button>
        </div>
      )}
      {turnStatus === "cancelled" && <p className="mt-2 text-xs text-muted-foreground">Cancelled — nothing was changed.</p>}
    </div>
  );
}
