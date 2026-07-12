"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RejectPopover({ onReject }: { onReject: (reason: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setSaving(true);
    await onReject(reason.trim());
    setSaving(false);
    setOpen(false);
    setReason("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" variant="outline" className="border-danger/40 text-danger hover:bg-danger/10" />}>
        Reject
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <p className="mb-1.5 text-xs font-medium text-foreground">Reason for rejection</p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Required — explain what needs to change"
          autoFocus
        />
        <Button size="sm" className="mt-2 w-full" disabled={!reason.trim() || saving} onClick={submit}>
          {saving ? "Rejecting…" : "Reject entry"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
