"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TopBar } from "@/components/nav/top-bar";
import { ChatDock } from "@/components/chat/chat-dock";
import { useAppStore } from "@/store/app-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAppStore((s) => s.status);
  const currentUser = useAppStore((s) => s.currentUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const requestFocusChat = useAppStore((s) => s.requestFocusChat);
  const setChatDockOpen = useAppStore((s) => s.setChatDockOpen);

  useEffect(() => {
    if (status === "idle") hydrate();
  }, [status, hydrate]);

  useEffect(() => {
    // UI/UX §6: 960–1279px starts with the dock collapsed to a floating bubble.
    if (window.innerWidth >= 960 && window.innerWidth < 1280) setChatDockOpen(false);
  }, [setChatDockOpen]);

  useEffect(() => {
    if (status === "ready" && !currentUser) {
      router.replace("/login");
    }
  }, [status, currentUser, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        requestFocusChat();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFocusChat]);

  if (status !== "ready" || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Loading Flowdesk…
        </div>
      </div>
    );
  }

  const showDock = pathname !== "/chat";

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        {showDock && <ChatDock />}
      </div>
    </div>
  );
}
