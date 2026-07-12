"use client";

import { useEffect } from "react";
import { Minus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useAppStore } from "@/store/app-store";

export function ChatDock() {
  const open = useAppStore((s) => s.chatDockOpen);
  const setOpen = useAppStore((s) => s.setChatDockOpen);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) {
    return (
      <Button
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open AI Chat"
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full shadow-md"
      >
        <MessageCircle className="size-5" />
      </Button>
    );
  }

  return (
    <>
      {/* ≥960px: persistent side dock */}
      <aside className="hidden w-[380px] shrink-0 flex-col border-l border-border bg-card duration-250 min-[960px]:flex">
        <DockHeader onCollapse={() => setOpen(false)} />
        <div className="min-h-0 flex-1">
          <ChatPanel variant="dock" />
        </div>
      </aside>

      {/* <960px: full-screen overlay per UI/UX §6 */}
      <div className="fixed inset-0 z-50 hidden flex-col bg-card max-[959px]:flex">
        <DockHeader onCollapse={() => setOpen(false)} />
        <div className="min-h-0 flex-1">
          <ChatPanel variant="dock" />
        </div>
      </div>
    </>
  );
}

function DockHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <h2 className="text-sm font-semibold text-foreground">AI Chat</h2>
      <Button variant="ghost" size="icon" className="size-7" onClick={onCollapse} aria-label="Collapse chat">
        <Minus className="size-4" />
      </Button>
    </div>
  );
}
