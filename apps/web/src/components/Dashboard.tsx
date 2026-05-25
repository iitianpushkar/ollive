"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
} from "recharts";
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
  throughput: Array<{ hour: string; requests: number; tokens: number }>;
  errors: Array<{ status: string; count: number; provider: string }>;
  byProvider: Array<{ provider: string; model: string; errors: number; total: number }>;
}

export function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics()
      .then(setData)
      .catch(() => setError("Could not load metrics. Is ingestion running?"));
  }, []);

  const throughputChart =
    data?.throughput.map((t) => ({
      hour: new Date(t.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      requests: t.requests,
      tokens: t.tokens,
    })) ?? [];

  const latencyChart =
    data?.latency.map((l) => ({
      name: `${l.provider}/${l.model}`,
      avg: Math.round(l.avg_latency_ms ?? 0),
      p95: Math.round(l.p95_latency_ms ?? 0),
    })) ?? [];

  const errorChart =
    data?.byProvider.map((e) => ({
      name: `${e.provider}/${e.model}`,
      errors: e.errors,
      success: e.total - e.errors,
    })) ?? [];

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inference Dashboard</h1>
          <p className="text-[var(--muted)]">Last {data?.windowHours ?? 24} hours</p>
        </div>
        <Link href="/chat" className="text-[var(--accent)] hover:underline">
          ← Back to chat
        </Link>
      </header>

      {error && <p className="text-[var(--error)]">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-semibold">Throughput (requests / hour)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={throughputChart}>
              <CartesianGrid stroke="#2d3a4f" />
              <XAxis dataKey="hour" stroke="#8b9cb3" fontSize={11} />
              <YAxis stroke="#8b9cb3" />
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2d3a4f" }} />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#3d9cf5" strokeWidth={2} />
              <Line type="monotone" dataKey="tokens" stroke="#34d399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-semibold">Latency (ms)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={latencyChart}>
              <CartesianGrid stroke="#2d3a4f" />
              <XAxis dataKey="name" stroke="#8b9cb3" fontSize={10} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="#8b9cb3" />
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2d3a4f" }} />
              <Legend />
              <Bar dataKey="avg" fill="#3d9cf5" name="avg" />
              <Bar dataKey="p95" fill="#a78bfa" name="p95" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-semibold">Errors vs success by model</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={errorChart}>
              <CartesianGrid stroke="#2d3a4f" />
              <XAxis dataKey="name" stroke="#8b9cb3" fontSize={10} />
              <YAxis stroke="#8b9cb3" />
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2d3a4f" }} />
              <Legend />
              <Bar dataKey="success" stackId="a" fill="#34d399" />
              <Bar dataKey="errors" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total requests (24h)"
            value={data.throughput.reduce((s, t) => s + t.requests, 0)}
          />
          <StatCard
            label="Errors"
            value={data.errors.filter((e) => e.status === "error").reduce((s, e) => s + e.count, 0)}
          />
          <StatCard
            label="Avg latency (top model)"
            value={
              data.latency[0]
                ? `${Math.round(data.latency[0].avg_latency_ms)} ms`
                : "—"
            }
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
