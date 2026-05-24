import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70 backdrop-blur-xl">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          AI Inference Observability Platform
        </div>

        <h1 className="gradient-text text-7xl font-black leading-[0.95] tracking-tight md:text-8xl">
          Observe
          <br />
          Intelligence.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-400">
          A cinematic AI chat and observability platform with realtime
          streaming, inference logging, provider tracing, and live metrics.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/chat"
            className="group rounded-2xl bg-white px-8 py-4 font-semibold text-black transition-all duration-300 hover:scale-105"
          >
            Open Chat
          </Link>

          <Link
            href="/dashboard"
            className="glass rounded-2xl px-8 py-4 font-semibold transition-all duration-300 hover:scale-105 hover:bg-white/10"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            "Realtime streaming",
            "Inference logging",
            "Multi-provider AI",
          ].map((item) => (
            <div
              key={item}
              className="glass rounded-3xl p-6 text-left shadow-2xl"
            >
              <div className="mb-4 h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400" />

              <h3 className="text-lg font-semibold">{item}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Premium observability and AI-native interaction design.
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}