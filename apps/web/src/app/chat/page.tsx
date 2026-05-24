"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatApp } from "@/components/ChatApp";

function ChatWithParams() {
  const params = useSearchParams();
  const id = params.get("id") ?? undefined;
  return <ChatApp initialConversationId={id} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted)]">Loading…</div>}>
      <ChatWithParams />
    </Suspense>
  );
}
