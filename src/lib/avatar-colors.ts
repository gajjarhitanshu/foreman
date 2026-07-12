import type { AvatarColor } from "@/lib/types";

export const avatarColorClasses: Record<AvatarColor, string> = {
  indigo: "bg-indigo-600 text-white",
  sky: "bg-sky-600 text-white",
  amber: "bg-amber-500 text-white",
  rose: "bg-rose-500 text-white",
  emerald: "bg-emerald-600 text-white",
};

export const priorityDotClasses: Record<"low" | "medium" | "high", string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

export const priorityLabel: Record<"low" | "medium" | "high", string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};
