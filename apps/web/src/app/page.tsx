import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="glass z-10 w-full max-w-4xl rounded-3xl p-10 md:p-14">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          LLM Inference Observability
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] md:text-6xl">
          Chat fast.
          <br />
          Measure everything.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
          Multi-turn streaming chat with inference logging, ingestion, and operational dashboards.
          Built for realistic LLM product workflows.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
          <span className="rounded-full border border-[var(--border)] px-3 py-1">Realtime streaming</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1">Token + latency logs</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1">Provider-level metrics</span>
        </div>

        <nav className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/chat"
            className="rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-black hover:opacity-90"
          >
            Open Chat
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--border)] px-6 py-3 font-medium hover:bg-[var(--surface)]"
          >
            View Dashboard
          </Link>
        </nav>
      </div>
    </main>
  );
}
