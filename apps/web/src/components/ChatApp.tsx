"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowUp,
  Sparkles,
  Square,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  cancelConversation,
  cancelStream,
  createConversation,
  fetchModels,
  getConversation,
  listConversations,
  streamChat,
  type Conversation,
  type Message,
  type OpenRouterModelOption,
} from "@/lib/api";

export function ChatApp({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activeId, setActiveId] =
    useState<string | undefined>(
      initialConversationId
    );

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [streaming, setStreaming] =
    useState(false);

  const [streamBuffer, setStreamBuffer] =
    useState("");

  const [models, setModels] =
    useState<OpenRouterModelOption[]>([]);

  const [configured, setConfigured] =
    useState(false);

  const [model, setModel] = useState(
    "openai/gpt-4o-mini"
  );

  const [vendorFilter, setVendorFilter] =
    useState<string>("all");

  const [error, setError] = useState<
    string | null
  >(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const vendors = useMemo(() => {
    const set = new Set(
      models.map((m) => m.vendor)
    );

    return [
      "all",
      ...Array.from(set).sort(),
    ];
  }, [models]);

  const filteredModels = useMemo(
    () =>
      vendorFilter === "all"
        ? models
        : models.filter(
            (m) =>
              m.vendor === vendorFilter
          ),
    [models, vendorFilter]
  );

  const loadList = useCallback(async () => {
    try {
      const list =
        await listConversations();

      setConversations(list);
    } catch {
      setError(
        "Could not load conversations"
      );
    }
  }, []);

  const loadConversation =
    useCallback(async (id: string) => {
      try {
        const data =
          await getConversation(id);

        setActiveId(id);

        setMessages(data.messages);

        if (data.model)
          setModel(data.model);

        setError(null);
      } catch {
        setError(
          "Conversation not found"
        );
      }
    }, []);

  useEffect(() => {
    void loadList();

    void fetchModels().then((cfg) => {
      setModels(cfg.models);

      setConfigured(cfg.configured);

      setModel(cfg.defaultModel);
    });
  }, [loadList]);

  useEffect(() => {
    if (initialConversationId)
      void loadConversation(
        initialConversationId
      );
  }, [
    initialConversationId,
    loadConversation,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, streamBuffer]);

  const handleNew = async () => {
    try {
      const conv =
        await createConversation({
          model,
        });

      setConversations((c) => [
        conv,
        ...c,
      ]);

      setActiveId(conv.id);

      setMessages([]);

      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to create"
      );
    }
  };

  const handleCancelConversation =
    async () => {
      if (!activeId) return;

      if (streaming) {
        abortRef.current?.abort();

        await cancelStream(activeId);
      }

      await cancelConversation(activeId);

      await loadList();

      await loadConversation(activeId);
    };

  const handleSend = async () => {
    if (
      !input.trim() ||
      !activeId ||
      streaming
    )
      return;

    const text = input.trim();

    setInput("");

    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),

      conversation_id: activeId,

      role: "user",

      content: text,

      created_at:
        new Date().toISOString(),
    };

    setMessages((m) => [
      ...m,
      userMsg,
    ]);

    setStreaming(true);

    setStreamBuffer("");

    abortRef.current = streamChat(
      activeId,
      text,
      { model },
      {
        onChunk: (chunk) =>
          setStreamBuffer(
            (b) => b + chunk
          ),

        onDone: () => {
          setStreaming(false);

          setStreamBuffer("");

          void loadConversation(
            activeId
          );

          void loadList();
        },

        onError: (msg) => {
          setStreaming(false);

          setStreamBuffer("");

          setError(msg);
        },

        onCancelled: () => {
          setStreaming(false);

          setStreamBuffer("");
        },
      }
    );
  };

  const handleStopStream =
    async () => {
      if (!activeId) return;

      abortRef.current?.abort();

      await cancelStream(activeId);

      setStreaming(false);

      setStreamBuffer("");
    };

  const activeConv =
    conversations.find(
      (c) => c.id === activeId
    );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}

      <aside className="glass m-4 flex w-80 flex-col rounded-[2rem]">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="gradient-text text-3xl font-black"
            >
              Ollive
            </Link>

            <button
              onClick={() =>
                void handleNew()
              }
              disabled={!configured}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:scale-105 disabled:opacity-40"
            >
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {conversations.map((c) => (
            <motion.button
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              key={c.id}
              onClick={() =>
                void loadConversation(c.id)
              }
              className={`mb-3 w-full rounded-2xl border p-4 text-left transition-all ${
                c.id === activeId
                  ? "border-violet-500 bg-violet-500/20"
                  : "border-white/5 bg-white/[0.03]"
              }`}
            >
              <span className="block truncate font-medium">
                {c.title ??
                  "Untitled"}
              </span>

              <span className="mt-2 block text-xs text-slate-400">
                {c.status} · {c.model}
              </span>
            </motion.button>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="border-t border-white/10 p-5 text-sm text-slate-400 transition hover:text-white"
        >
          Open observability dashboard →
        </Link>
      </aside>

      {/* MAIN */}

      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}

        <header className="flex flex-wrap items-center gap-4 px-8 py-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

              <span className="text-sm text-slate-400">
                Realtime inference stream
              </span>
            </div>

            <h1 className="mt-2 text-4xl font-black">
              Neural Chat
            </h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Vendor Filter */}

            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3">
              <Sparkles size={16} />

              <select
                value={vendorFilter}
                onChange={(e) =>
                  setVendorFilter(
                    e.target.value
                  )
                }
                className="bg-transparent text-sm outline-none"
              >
                {vendors.map((v) => (
                  <option
                    key={v}
                    value={v}
                    className="bg-black"
                  >
                    {v === "all"
                      ? "All vendors"
                      : v}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Select */}

            <div className="glass rounded-2xl px-4 py-3">
              <select
                value={model}
                onChange={(e) =>
                  setModel(
                    e.target.value
                  )
                }
                disabled={!configured}
                className="min-w-[220px] bg-transparent text-sm outline-none"
              >
                {filteredModels.map(
                  (m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="bg-black"
                    >
                      {m.name} ({m.id})
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Cancel Conversation */}

            {activeId && (
              <button
                onClick={() =>
                  void handleCancelConversation()
                }
                disabled={
                  activeConv?.status ===
                  "cancelled"
                }
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
              >
                Cancel conversation
              </button>
            )}
          </div>
        </header>

        {/* API KEY WARNING */}

        {!configured && (
          <div className="mx-8 mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            Set OPENROUTER_API_KEY to
            start chatting.
          </div>
        )}

        {/* CHAT AREA */}

        <div className="flex-1 overflow-y-auto px-8 pb-52">
          {!activeId && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 opacity-70 blur-[2px]" />

                <h2 className="text-4xl font-black">
                  Observe Intelligence
                </h2>

                <p className="mt-4 text-slate-400">
                  Start a new conversation
                  or select one from the
                  sidebar.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className={`mb-8 flex ${
                  m.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-[2rem] px-6 py-5 shadow-2xl ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-violet-600 to-cyan-500 text-white"
                      : "glass border border-white/10"
                  }`}
                >
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
                    {m.role}
                  </p>

                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[
                        remarkGfm,
                      ]}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* STREAMING */}

          {streamBuffer && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="mb-8 flex justify-start"
            >
              <div className="glass streaming-cursor max-w-3xl rounded-[2rem] border border-violet-500/20 px-6 py-5 shadow-2xl">
                <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-300">
                  <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />

                  streaming
                </div>

                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm,
                    ]}
                  >
                    {streamBuffer}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ERROR */}

        {error && (
          <div className="px-8 pb-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* INPUT */}

        <footer className="pointer-events-none absolute bottom-0 left-0 right-0 p-8">
          <div className="pointer-events-auto mx-auto max-w-4xl">
            <div className="glass rounded-[2rem] border border-white/10 p-3 shadow-2xl">
              <div className="flex items-end gap-4">
                <textarea
                  value={input}
                  rows={1}
                  onChange={(e) =>
                    setInput(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                        "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();

                      void handleSend();
                    }
                  }}
                  disabled={
                    !activeId ||
                    streaming ||
                    activeConv?.status ===
                      "cancelled" ||
                    !configured
                  }
                  placeholder={
                    activeConv?.status ===
                    "cancelled"
                      ? "Conversation cancelled"
                      : configured
                        ? "Ask anything..."
                        : "Configure OpenRouter API key"
                  }
                  className="max-h-40 flex-1 resize-none bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />

                {streaming ? (
                  <button
                    onClick={() =>
                      void handleStopStream()
                    }
                    className="rounded-2xl bg-red-500 p-4 text-white transition hover:scale-105"
                  >
                    <Square size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      void handleSend()
                    }
                    disabled={
                      !activeId ||
                      !input.trim() ||
                      activeConv?.status ===
                        "cancelled" ||
                      !configured
                    }
                    className="rounded-2xl bg-white p-4 text-black transition hover:scale-105 disabled:opacity-40"
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-5 text-xs text-slate-500">
              <span>
                Streaming enabled
              </span>

              <span>
                Observability active
              </span>

              <span>
                Multi-provider
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}