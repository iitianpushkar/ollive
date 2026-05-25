"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelStream,
  createConversation,
  deleteConversation,
  fetchModels,
  getConversation,
  listConversations,
  streamChat,
  type Conversation,
  type Message,
  type OpenRouterModelOption,
} from "@/lib/api";

const titleFromMessage = (text: string) => text.trim().replace(/\s+/g, " ").slice(0, 64);

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-sm">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="chat-markdown">
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-3" />;
        if (trimmed.startsWith("### ")) {
          return <h3 key={index}>{renderInline(trimmed.slice(4))}</h3>;
        }
        if (trimmed.startsWith("#### ")) {
          return <h4 key={index}>{renderInline(trimmed.slice(5))}</h4>;
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          return <p key={index} className="pl-4">{renderInline(trimmed)}</p>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <p key={index} className="pl-4">• {renderInline(trimmed.slice(2))}</p>;
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function ResumeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 0 0-14.6-4.5M4 7V3m0 4h4m-4 6a8 8 0 0 0 14.6 4.5M20 17v4m0-4h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatApp({ initialConversationId }: { initialConversationId?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [models, setModels] = useState<OpenRouterModelOption[]>([]);
  const [configured, setConfigured] = useState(false);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [canResume, setCanResume] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const pendingChunksRef = useRef("");
  const flushRafRef = useRef<number | null>(null);
  const currentPromptRef = useRef("");
  const stoppedRef = useRef(false);

  const flushStreamBuffer = useCallback(() => {
    if (!pendingChunksRef.current) {
      flushRafRef.current = null;
      return;
    }
    const chunkSize = pendingChunksRef.current.length > 80 ? 5 : 2;
    const chunks = pendingChunksRef.current.slice(0, chunkSize);
    pendingChunksRef.current = pendingChunksRef.current.slice(chunkSize);
    setStreamBuffer((prev) => prev + chunks);
    flushRafRef.current =
      pendingChunksRef.current.length > 0 ? requestAnimationFrame(flushStreamBuffer) : null;
  }, []);

  const flushAllStreamBuffer = useCallback(() => {
    if (flushRafRef.current !== null) {
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
    if (!pendingChunksRef.current) return;
    const chunks = pendingChunksRef.current;
    pendingChunksRef.current = "";
    setStreamBuffer((prev) => prev + chunks);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushRafRef.current !== null) return;
    flushRafRef.current = requestAnimationFrame(flushStreamBuffer);
  }, [flushStreamBuffer]);

  const updateAutoScrollIntent = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }, []);

  const vendors = useMemo(() => {
    const set = new Set(models.map((m) => m.vendor));
    return ["all", ...Array.from(set).sort()];
  }, [models]);

  const filteredModels = useMemo(
    () => (vendorFilter === "all" ? models : models.filter((m) => m.vendor === vendorFilter)),
    [models, vendorFilter]
  );

  const loadList = useCallback(async () => {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      setError("Could not load conversations");
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const data = await getConversation(id);
      setActiveId(id);
      setMessages(data.messages);
      if (data.model) setModel(data.model);
      setError(null);
    } catch {
      setError("Conversation not found");
    }
  }, []);

  useEffect(() => {
    void loadList();
    void fetchModels().then((cfg) => {
      setModels(cfg.models);
      setConfigured(cfg.configured);
      setModel(cfg.defaultModel);
    });
    return () => {
      if (flushRafRef.current !== null) cancelAnimationFrame(flushRafRef.current);
    };
  }, [loadList]);

  useEffect(() => {
    if (initialConversationId) void loadConversation(initialConversationId);
  }, [initialConversationId, loadConversation]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streamBuffer]);

  const handleNew = useCallback(async (): Promise<string | null> => {
    try {
      const conv = await createConversation({ model });
      setConversations((c) => [conv, ...c]);
      setActiveId(conv.id);
      setMessages([]);
      setStreamBuffer("");
      setCanResume(false);
      setRetryPrompt(null);
      setError(null);
      return conv.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create conversation");
      return null;
    }
  }, [model]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || !configured) return;

      let conversationId: string | null | undefined = activeId;
      const shouldRenameConversation = !conversationId;
      if (!conversationId) {
        conversationId = await handleNew();
        if (!conversationId) return;
      }

      setError(null);
      setCanResume(false);
      setRetryPrompt(null);
      setInput("");
      shouldAutoScrollRef.current = true;
      currentPromptRef.current = text;
      stoppedRef.current = false;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg]);
      if (shouldRenameConversation) {
        const title = titleFromMessage(text);
        setConversations((items) =>
          items.map((item) => (item.id === conversationId ? { ...item, title } : item))
        );
      }
      setStreaming(true);
      setStreamBuffer("");
      pendingChunksRef.current = "";

      abortRef.current = streamChat(
        conversationId,
        text,
        { model },
        {
          onChunk: (chunk) => {
            if (stoppedRef.current) return;
            pendingChunksRef.current += chunk;
            scheduleFlush();
          },
          onDone: () => {
            if (stoppedRef.current) {
              setStreaming(false);
              setCanResume(true);
              setRetryPrompt(currentPromptRef.current);
              return;
            }
            flushAllStreamBuffer();
            setStreaming(false);
            setStreamBuffer("");
            setCanResume(false);
            setRetryPrompt(null);
            void loadConversation(conversationId);
            void loadList();
          },
          onError: (msg) => {
            flushAllStreamBuffer();
            setStreaming(false);
            setRetryPrompt(text);
            setError(msg);
          },
          onCancelled: async (data) => {
            flushAllStreamBuffer();
            setStreaming(false);
            setCanResume(true);
            setRetryPrompt(text);
            if (data?.partial || data?.messageId) {
              setStreamBuffer("");
              await loadConversation(conversationId);
              await loadList();
            }
          },
        }
      );
    },
    [
      activeId,
      configured,
      flushAllStreamBuffer,
      flushStreamBuffer,
      handleNew,
      loadConversation,
      loadList,
      model,
      scheduleFlush,
      streaming,
    ]
  );

  const handleSend = async () => {
    await sendMessage(input.trim());
  };

  const handleRetry = async () => {
    if (!retryPrompt) return;
    await sendMessage(retryPrompt);
  };

  const handleStopStream = async () => {
    if (!activeId) return;
    stoppedRef.current = true;
    flushAllStreamBuffer();
    setStreaming(false);
    setCanResume(true);
    setRetryPrompt(currentPromptRef.current);
    try {
      await cancelStream(activeId);
    } catch {
      setError("Could not stop the response cleanly");
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeId) return;
    if (!confirm("Delete this conversation permanently?")) return;
    try {
      if (streaming) {
        abortRef.current?.abort();
        await cancelStream(activeId);
      }
      await deleteConversation(activeId);
      setMessages([]);
      setStreamBuffer("");
      setCanResume(false);
      setRetryPrompt(null);
      setActiveId(undefined);
      await loadList();
    } catch {
      setError("Failed to delete conversation");
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <aside className="hidden w-[285px] shrink-0 flex-col border-r border-[var(--border)] bg-black md:flex">
        <div className="flex items-center p-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-sm font-semibold"
          >
            O
          </Link>
        </div>
        <div className="space-y-1 px-3 pb-3 text-sm">
          <button
            onClick={() => void handleNew()}
            disabled={!configured}
            className="block w-full rounded-md px-3 py-2 text-left hover:bg-[var(--surface)] disabled:opacity-40"
          >
            New chat
          </button>
          <Link href="/dashboard" className="block rounded-md px-3 py-2 hover:bg-[var(--surface)]">
            Dashboard
          </Link>
        </div>
        <p className="px-6 pb-2 pt-4 text-xs font-semibold text-[var(--muted)]">Recents</p>
        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => void loadConversation(c.id)}
                className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  c.id === activeId ? "bg-[var(--surface-strong)]" : "hover:bg-[var(--surface)]"
                }`}
              >
                <p className="truncate">{c.title ?? "Untitled conversation"}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-black">
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <h1 className="mr-2 text-lg font-semibold">Ollive</h1>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded-md border border-transparent bg-black px-2 py-1 text-sm text-[var(--muted)] outline-none hover:bg-[var(--surface)]"
          >
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All vendors" : v}
              </option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="hidden min-w-[200px] rounded-md border border-transparent bg-black px-2 py-1 text-sm text-[var(--muted)] outline-none hover:bg-[var(--surface)] sm:block"
            disabled={!configured}
          >
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {activeId && (
            <button
              onClick={() => void handleDeleteConversation()}
              className="ml-auto rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            >
              Delete
            </button>
          )}
        </header>

        <section
          ref={scrollAreaRef}
          onScroll={updateAutoScrollIntent}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-36 pt-6"
        >
          {!activeId && messages.length === 0 && !streamBuffer && (
            <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center text-center">
              <h2 className="text-3xl font-semibold">What can I help with?</h2>
            </div>
          )}

          <div className="mx-auto max-w-3xl">
            {messages.map((m, index) => {
              const isLastInterruptedAssistant =
                canResume && index === messages.length - 1 && m.role === "assistant";
              return (
              <div
                key={m.id}
                className={`mb-7 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={m.role === "user" ? "max-w-[78%]" : "w-full max-w-none"}>
                  <div
                    className={
                      m.role === "user"
                        ? "rounded-[22px] bg-[var(--surface-strong)] px-5 py-3 leading-7"
                        : "leading-8 text-[15.5px]"
                    }
                  >
                    <MarkdownMessage content={m.content} />
                  </div>
                  {isLastInterruptedAssistant && (
                    <button
                      onClick={() => void handleRetry()}
                      disabled={!configured || !retryPrompt}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:opacity-40"
                      aria-label="Retry prompt"
                      title="Retry prompt"
                    >
                      <ResumeIcon />
                      Retry
                    </button>
                  )}
                </div>
              </div>
              );
            })}

            {streamBuffer && (
              <div className="mb-7 leading-8 text-[15.5px]">
                <MarkdownMessage content={streamBuffer} />
                {streaming && (
                  <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--text)] align-middle" />
                )}
                {!streaming && canResume && (
                  <button
                    onClick={() => void handleRetry()}
                    disabled={!configured || !retryPrompt}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:opacity-40"
                    aria-label="Retry prompt"
                    title="Retry prompt"
                  >
                    <ResumeIcon />
                    Retry
                  </button>
                )}
              </div>
            )}
            {!streamBuffer && !streaming && canResume && retryPrompt && (
              <div className="mb-7">
                <button
                  onClick={() => void handleRetry()}
                  disabled={!configured}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:opacity-40"
                  aria-label="Retry prompt"
                  title="Retry prompt"
                >
                  <ResumeIcon />
                  Retry
                </button>
              </div>
            )}
            <div ref={bottomRef} />
            </div>
        </section>

        {error && <p className="px-4 pb-2 text-sm text-[var(--error)]">{error}</p>}

        <footer className="shrink-0 px-3 pb-4 md:px-6">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-[28px] bg-[var(--surface-strong)] px-4 py-2 shadow-[0_-18px_45px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--text)]"
              aria-label="Add"
            >
              +
            </button>
            <textarea
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={streaming || !configured}
              placeholder={configured ? "Ask anything" : "Configure OPENROUTER_API_KEY"}
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {streaming ? (
              <button
                onClick={() => void handleStopStream()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black"
                aria-label="Stop"
              >
                ■
              </button>
            ) : (
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || !configured}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-black disabled:bg-[var(--border)] disabled:text-[var(--muted)]"
                aria-label="Send"
              >
                ↑
              </button>
            )}
            {!streaming && retryPrompt && (
              <button
                onClick={() => void handleRetry()}
                disabled={!configured}
                className="shrink-0 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-40"
              >
                Retry
              </button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-[var(--muted)]">
            Ollive can make mistakes. Check important info.
          </p>
        </footer>
      </main>
    </div>
  );
}
