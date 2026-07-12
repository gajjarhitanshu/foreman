import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <ChatPanel variant="full" />
    </div>
  );
}
