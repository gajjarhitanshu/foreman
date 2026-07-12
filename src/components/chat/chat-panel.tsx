"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { ConfirmationCard } from "@/components/chat/confirmation-card";
import { SummaryCard } from "@/components/chat/summary-card";
import { ClarifyChips } from "@/components/chat/clarify-chips";
import { roleOn } from "@/lib/permissions";

export function ChatPanel({ variant = "dock" }: { variant?: "dock" | "full" }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const chat = useAppStore((s) => s.chat);
  const chatPending = useAppStore((s) => s.chatPending);
  const members = useAppStore((s) => s.members);
  const projects = useAppStore((s) => s.projects);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const chatFocusSignal = useAppStore((s) => s.chatFocusSignal);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, chatPending]);

  useEffect(() => {
    if (chatFocusSignal > 0) inputRef.current?.focus();
  }, [chatFocusSignal]);

  const awaitingConfirmation = [...chat].reverse().find((m) => m.turnStatus === "pending");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || awaitingConfirmation) return;
    setInput("");
    await sendChatMessage(value);
  }

  if (!currentUser) return null;

  const myRoles = projects
    .map((p) => {
      const role = roleOn(members, currentUser.id, p.id);
      return role ? `${role === "manager" ? "Manager" : "Developer"} on ${p.name}` : null;
    })
    .filter((v): v is string => Boolean(v));

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className={cn("flex-1 space-y-3 overflow-y-auto", variant === "full" ? "px-6 py-6" : "p-4")}>
        {chat.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] space-y-2", variant === "full" && "max-w-xl")}>
              <div
                className={cn(
                  "whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {message.role === "assistant" && <Bot className="mb-1 size-3.5 text-muted-foreground" />}
                {message.content}
              </div>

              {message.actions && message.actions.length > 0 && (
                <ConfirmationCard
                  messageId={message.id}
                  actions={message.actions}
                  turnStatus={message.turnStatus}
                  results={message.results}
                />
              )}

              {message.clarify && <ClarifyChips messageId={message.id} options={message.clarify.options} resolved={message.clarifyResolved} />}

              {message.summary && <SummaryCard messageId={message.id} summary={message.summary} />}
            </div>
          </div>
        ))}
        {chatPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-xl bg-muted px-3.5 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className={cn("border-t border-border", variant === "full" ? "px-6 py-4" : "p-3")}>
        <p className="mb-2 text-xs text-muted-foreground">
          Acting as: {myRoles.length > 0 ? myRoles.join(" · ") : "not a member of any project"}
        </p>
        {awaitingConfirmation && <p className="mb-2 text-xs font-medium text-primary">Waiting for your confirmation above.</p>}
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything…"
            className="bg-secondary"
            disabled={!!awaitingConfirmation}
          />
          <Button type="submit" disabled={!input.trim() || !!awaitingConfirmation}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
