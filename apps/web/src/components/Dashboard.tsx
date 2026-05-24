"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Brain,
  Clock3,
  Sparkles,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";

import { motion } from "framer-motion";

import { fetchMetrics } from "@/lib/api";

interface MetricsData {
  windowHours: number;

  latency: Array<{
    provider: string;
    model: string;
    requests: number;
    avg_latency_ms: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
  }>;

  throughput: Array<{
    hour: string;
    requests: number;
    tokens: number;
  }>;

  errors: Array<{
    status: string;
    count: number;
    provider: string;
  }>;

  byProvider: Array<{
    provider: string;
    model: string;
    errors: number;
    total: number;
  }>;
}

export function Dashboard() {
  const [data, setData] =
    useState<MetricsData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    fetchMetrics()
      .then(setData)
      .catch(() =>
        setError(
          "Could not load metrics. Is ingestion running?"
        )
      );
  }, []);

  const throughputChart =
    data?.throughput.map((t) => ({
      hour: new Date(
        t.hour
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      requests: t.requests,

      tokens: t.tokens,
    })) ?? [];

  const latencyChart =
    data?.latency.map((l) => ({
      name: `${l.provider}/${l.model}`,

      avg: Math.round(
        l.avg_latency_ms ?? 0
      ),

      p95: Math.round(
        l.p95_latency_ms ?? 0
      ),
    })) ?? [];

  const errorChart =
    data?.byProvider.map((e) => ({
      name: `${e.provider}/${e.model}`,

      errors: e.errors,

      success: e.total - e.errors,
    })) ?? [];

  return (
    <div className="h-screen overflow-y-auto">
      <main className="min-h-screen px-8 py-8">
        {/* HEADER */}

        <motion.header
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-10 flex flex-wrap items-center justify-between gap-5"
        >
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

              Live inference monitoring
            </div>

            <h1 className="gradient-text text-5xl font-black tracking-tight">
              AI Observability
            </h1>

            <p className="mt-3 text-slate-400">
              Realtime inference analytics
              and neural tracing
            </p>
          </div>

          <Link
            href="/chat"
            className="glass rounded-2xl px-6 py-4 text-sm font-medium transition-all hover:scale-105 hover:bg-white/10"
          >
            ← Back to chat
          </Link>
        </motion.header>

        {/* ERROR */}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        {/* STATS */}

        {data && (
          <div className="mb-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={
                <Activity size={20} />
              }
              label="Total requests"
              value={data.throughput
                .reduce(
                  (s, t) =>
                    s + t.requests,
                  0
                )
                .toString()}
            />

            <StatCard
              icon={<Brain size={20} />}
              label="Tokens streamed"
              value={data.throughput
                .reduce(
                  (s, t) =>
                    s + t.tokens,
                  0
                )
                .toString()}
            />

            <StatCard
              icon={
                <AlertTriangle
                  size={20}
                />
              }
              label="Errors"
              value={data.errors
                .filter(
                  (e) =>
                    e.status ===
                    "error"
                )
                .reduce(
                  (s, e) =>
                    s + e.count,
                  0
                )
                .toString()}
            />

            <StatCard
              icon={
                <Clock3 size={20} />
              }
              label="Avg latency"
              value={
                data.latency[0]
                  ? `${Math.round(
                      data.latency[0]
                        .avg_latency_ms
                    )} ms`
                  : "—"
              }
            />
          </div>
        )}

        {/* CHARTS */}

        <div className="grid gap-8 xl:grid-cols-2">
          {/* THROUGHPUT */}

          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="glass rounded-[2rem] p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Throughput Stream
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Requests and tokens
                  over time
                </p>
              </div>

              <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
                <Sparkles size={20} />
              </div>
            </div>

            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <AreaChart
                data={throughputChart}
              >
                <defs>
                  <linearGradient
                    id="gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#06b6d4"
                      stopOpacity={0.7}
                    />

                    <stop
                      offset="95%"
                      stopColor="#06b6d4"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                />

                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  fontSize={11}
                />

                <YAxis stroke="#94a3b8" />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0f172a",

                    border:
                      "1px solid rgba(255,255,255,0.08)",

                    borderRadius: 16,
                  }}
                />

                <Legend />

                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#06b6d4"
                  fill="url(#gradient)"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.section>

          {/* LATENCY */}

          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="glass rounded-[2rem] p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Latency Matrix
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Avg and p95 latency
                </p>
              </div>

              <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                <Brain size={20} />
              </div>
            </div>

            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={latencyChart}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                />

                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  angle={-10}
                  textAnchor="end"
                  height={70}
                />

                <YAxis stroke="#94a3b8" />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0f172a",

                    border:
                      "1px solid rgba(255,255,255,0.08)",

                    borderRadius: 16,
                  }}
                />

                <Legend />

                <Bar
                  dataKey="avg"
                  fill="#06b6d4"
                  radius={[
                    10, 10, 0, 0,
                  ]}
                />

                <Bar
                  dataKey="p95"
                  fill="#8b5cf6"
                  radius={[
                    10, 10, 0, 0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.section>

          {/* ERRORS */}

          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
            className="glass col-span-full rounded-[2rem] p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Provider Health
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Success vs error
                  distribution
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <Activity size={20} />
              </div>
            </div>

            <ResponsiveContainer
              width="100%"
              height={340}
            >
              <BarChart
                data={errorChart}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                />

                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                />

                <YAxis stroke="#94a3b8" />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0f172a",

                    border:
                      "1px solid rgba(255,255,255,0.08)",

                    borderRadius: 16,
                  }}
                />

                <Legend />

                <Bar
                  dataKey="success"
                  stackId="a"
                  fill="#22c55e"
                  radius={[
                    8, 8, 0, 0,
                  ]}
                />

                <Bar
                  dataKey="errors"
                  stackId="a"
                  fill="#ef4444"
                  radius={[
                    8, 8, 0, 0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;

  label: string;

  value: string | number;
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="glass rounded-[2rem] p-6 shadow-2xl"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
        {icon}
      </div>

      <p className="text-sm text-slate-400">
        {label}
      </p>

      <h3 className="mt-2 text-4xl font-black tracking-tight">
        {value}
      </h3>
    </motion.div>
  );
}