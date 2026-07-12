"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";

export default function Home() {
  const router = useRouter();
  const status = useAppStore((s) => s.status);
  const currentUser = useAppStore((s) => s.currentUser);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== "ready") return;
    router.replace(currentUser ? "/board" : "/login");
  }, [status, currentUser, router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        Loading Flowdesk…
      </div>
    </div>
  );
}
