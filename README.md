# Ollive — LLM Inference Logging Platform

A full-stack TypeScript platform for **chat**, **LLM inference observability**, and **metrics dashboards**.

Built as an end-to-end inference logging and ingestion system with:

- Multi-turn chat
- Streaming responses
- Observability SDK
- Event-driven ingestion pipeline
- Real-time metrics dashboards
- Multi-provider LLM support

---

# Stack

- **Frontend:** Next.js 15 + Tailwind CSS
- **Backend:** Express.js
- **Database:** PostgreSQL
- **Queue/Event Bus:** Redis Streams
- **Language:** TypeScript
- **Containerization:** Docker + Docker Compose
- **SDK:** `@ollive/sdk`

---

# Features

| Feature | Implementation |
|---|---|
| Multi-turn chatbot | Express chatbot + Next.js UI with context window |
| Streaming responses | Server-Sent Events (SSE) |
| Inference SDK | `@ollive/sdk` trace wrapper |
| Observability | Logging, latency, tokens, errors |
| PII redaction | Sensitive preview masking |
| Event-driven ingestion | Redis Streams consumer groups |
| Metrics dashboard | Recharts visualizations |
| Multi-provider support | OpenRouter integration |
| Conversation management | Resume / cancel chat sessions |
| Docker support | One-command local setup |

---

# Architecture

Ollive is structured as a TypeScript monorepo with three runtime layers.

| Layer | Stack | Responsibility |
|---|---|---|
| Web | Next.js 15 | Chat UI + Dashboard |
| Chatbot | Express | LLM orchestration + streaming |
| Ingestion | Express + Worker | Logging pipeline + metrics |

Shared packages:

- `@ollive/sdk`
- `@ollive/db`

---

## System Diagram

```text
┌─────────────┐     REST/SSE      ┌──────────────┐
│  Next.js    │ ────────────────► │   Chatbot    │
│   (web)     │                   │   Express    │
└──────┬──────┘                   └──────┬───────┘
       │ metrics                       │ @ollive/sdk
       │                               ▼
       │                        ┌──────────────┐
       └──────────────────────► │  Ingestion   │
                                │   Express    │
                                └──────┬───────┘
                                       │ XADD
                                       ▼
                                ┌──────────────┐
                                │    Redis     │
                                │   Streams    │
                                └──────┬───────┘
                                       │ XREADGROUP
                                       ▼
                                ┌──────────────┐
                                │   Worker     │
                                └──────┬───────┘
                                       ▼
                                ┌──────────────┐
                                │  PostgreSQL  │
                                └──────────────┘
```

---

# Quick Start (Docker)

## 1. Clone Repository

```bash
git clone <your-repo-url>
cd ollive
```

---

## 2. Create Environment File

```bash
cp .env.example .env
```

Add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-...
```

---

## 3. Start Everything

```bash
docker compose up --build
```

---

# Services

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| Chatbot API | http://localhost:8000 |
| Ingestion API | http://localhost:8001 |

---

# Project Structure

```text
ollive/
├── apps/
│   └── web/                  # Next.js frontend
│
├── packages/
│   ├── ollive-sdk/           # Inference logging SDK
│   └── db/                   # Shared PostgreSQL pool
│
├── services/
│   ├── chatbot/              # Express chatbot service
│   └── ingestion/            # Ingestion API + worker
│
├── infra/
│   └── init.sql              # Database schema
│
└── docker-compose.yml
```

---

# API Overview

# Chatbot API (`:8000`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Resume conversation |
| POST | `/api/conversations/:id/cancel` | Cancel conversation |
| POST | `/api/chat/:id` | Send message |
| POST | `/api/chat/:id/cancel-stream` | Abort active stream |

---

# Ingestion API (`:8001`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/logs` | Ingest inference log |
| GET | `/api/v1/metrics/summary` | Dashboard metrics |

Authentication header:

```http
X-API-Key: <INGESTION_API_KEY>
```

---

# Ingestion Pipeline

1. Chatbot wraps every LLM call with `OlliveLogger.trace()`
2. SDK captures metadata and inference metrics
3. Sensitive previews are redacted
4. SDK asynchronously sends logs to ingestion API
5. Ingestion service validates payloads with Zod
6. Logs are appended to Redis Streams
7. Worker consumes logs through consumer groups
8. Logs are persisted into PostgreSQL
9. Metrics are aggregated into hourly rollups
10. Dashboard queries aggregated metrics

---

# Why Async Ingestion?

Separating logging from the inference request path prevents database writes from increasing chatbot latency.

Benefits:

- Faster user responses
- Better burst handling
- Horizontally scalable ingestion
- Fault isolation

---

# SDK Usage

```ts
import { OlliveLogger } from "@ollive/sdk";

const logger = new OlliveLogger({
  ingestionUrl: process.env.INGESTION_URL,
  apiKey: process.env.INGESTION_API_KEY,
});

await logger.trace(
  {
    sessionId: "sess-123",
    provider: "openai",
    model: "gpt-4o-mini",
    conversationId: "...",
    requestInput: userPrompt,
    isStreaming: true,
  },
  async (ctx) => {
    const result = await callLLM();

    ctx.response = result.text;
    ctx.totalTokens = result.tokens;

    return result;
  }
);
```

---

# Logging Strategy

## Near Real-Time Logging

Logs are sent immediately without batching.

---

## Best-Effort Delivery

SDK logging failures never break chat functionality.

---

## PII Redaction

Sensitive data is masked before transmission:

- Emails
- Phone numbers
- Credit cards
- SSNs
- API keys

---

## Preview-Only Storage

The system does not store full prompts or responses.

Only:

- Truncated previews
- Metadata
- Latency
- Token counts
- Errors

---

# Database Schema

## `conversations`

Stores top-level chat sessions.

Status values:

- `active`
- `cancelled`
- `completed`

---

## `messages`

Normalized conversation history.

---

## `inference_logs`

Append-only observability events.

Stores:

- Metadata
- Provider/model info
- Timing
- Preview snippets
- Errors

---

## `metrics_hourly`

Pre-aggregated metrics rollups for fast dashboards.

---

# Event-Driven Architecture

Redis Streams acts as the event bus between:

| Component | Responsibility |
|---|---|
| Ingestion API | Produces events |
| Worker | Consumes and persists events |

Consumer groups enable:

- Horizontal scaling
- Reliable delivery
- Failure recovery

---

# Multi-Provider LLM Support

All LLM traffic routes through OpenRouter using the OpenAI-compatible Chat Completions API.

Supported providers include:

- OpenAI
- Anthropic
- Google
- DeepSeek
- Grok
- Meta Llama

Example model IDs:

```text
openai/gpt-4o-mini
anthropic/claude-sonnet-4
```

---

# Metrics Dashboard

Dashboard visualizes:

- Latency
- Request throughput
- Error rate
- Token usage
- Provider distribution

Built with:

- Recharts
- Tailwind CSS
- Next.js

---

# Scaling Considerations

## Ingestion API

Stateless and horizontally scalable.

---

## Workers

Scale independently through Redis consumer groups.

---

## PostgreSQL

Potential future optimizations:

- Read replicas
- Time partitioning
- Materialized views

---

## Redis

Streams can be trimmed with `MAXLEN` to prevent memory growth.

---

# Failure Handling

| Failure | Behavior |
|---|---|
| Ingestion API down | SDK drops logs silently |
| Redis down | Ingestion returns 503 |
| Worker crash | Messages re-delivered |
| Invalid payload | Rejected by validation |
| LLM provider error | Logged with error status |
| User cancellation | Logged as cancelled |

---

# Security Notes

- Ingestion API protected with `X-API-Key`
- CORS restricted to frontend origin
- Secrets stored in `.env` or Kubernetes Secrets
- Sensitive previews redacted before persistence

---

# Demo Flow

1. Start stack with Docker Compose
2. Open chat UI
3. Send streaming prompts
4. Observe metrics dashboard populate
5. Cancel/resume conversations
6. Watch logs flow through ingestion pipeline

---
