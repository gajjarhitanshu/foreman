"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidingTabs, type SlidingTab } from "@/components/nav/sliding-tabs";
import { TicketSearch } from "@/components/nav/ticket-search";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { useAppStore } from "@/store/app-store";
import { avatarColorClasses } from "@/lib/avatar-colors";
import { managedProjectIds, roleOn } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

const NAV_ROUTES: Record<string, string> = {
  board: "/board",
  timesheet: "/timesheet",
  approvals: "/approvals",
  chat: "/chat",
};

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const currentUser = useAppStore((s) => s.currentUser);
  const members = useAppStore((s) => s.members);
  const projects = useAppStore((s) => s.projects);
  const timesheet = useAppStore((s) => s.timesheet);
  const signOut = useAppStore((s) => s.signOut);

  if (!currentUser) return null;

  const ThemeIcon = THEME_ICONS[(theme as keyof typeof THEME_ICONS) ?? "system"] ?? Monitor;
  const myProjects = projects.filter((p) => roleOn(members, currentUser.id, p.id));
  const managed = new Set(managedProjectIds(members, currentUser.id));
  const pendingCount = timesheet.filter((e) => e.status === "pending" && managed.has(e.projectId)).length;

  const tabs: SlidingTab[] = [
    { value: "board", label: "Board" },
    { value: "timesheet", label: "Timesheet" },
    ...(managed.size > 0 ? [{ value: "approvals", label: "Approvals", badge: pendingCount }] : []),
    { value: "chat", label: "Chat" },
  ];
  const activeTab = tabs.find((t) => pathname.startsWith(NAV_ROUTES[t.value]))?.value ?? "board";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <Link href="/board" className="flex items-center gap-2">
        <span className="size-6 rounded-md bg-primary" />
        <span className="hidden font-semibold text-foreground sm:inline">Flowdesk</span>
      </Link>

      <div className="flex flex-1 justify-center">
        <SlidingTabs tabs={tabs} value={activeTab} onChange={(v) => router.push(NAV_ROUTES[v])} />
      </div>

      <TicketSearch />
      <NewProjectDialog />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
          <ThemeIcon className="size-4" />
          <span className="sr-only">Change theme</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            {(["light", "dark", "system"] as const).map((t) => {
              const Icon = THEME_ICONS[t];
              return (
                <DropdownMenuItem key={t} onClick={() => setTheme(t)}>
                  <Icon className={cn("size-4", theme === t ? "text-primary" : "text-muted-foreground")} />
                  <span className="capitalize">{t}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted" />}
        >
          <Avatar className="size-7">
            <AvatarFallback className={avatarColorClasses[currentUser.avatarColor]}>{currentUser.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{currentUser.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
            <div className="px-1.5 pb-1.5 text-xs text-muted-foreground">
              {myProjects.length === 0
                ? "Not a member of any project"
                : myProjects.map((p) => `${p.name} · ${roleOn(members, currentUser.id, p.id)}`).join(" · ")}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
