# Ingestion Pipeline — Workflow Orchestration Demo

## Live demo

https://upwork-demo-122-full-stack-engineer.vercel.app


A multi-step **document ingestion pipeline** that models a long-running,
asynchronous process the way a Temporal-style orchestrator would: every step has
a **retry policy** (max attempts + exponential backoff) and a **timeout**, and
failures are recorded as discrete attempts and retried — never masked with a
fake default.

This is a focused, end-to-end slice (UI → API → workflow engine → datastore)
built with Next.js. The production target is Python/Go on a real Temporal
cluster; this demo uses a lightweight in-process TS engine to show the *patterns*.

## What it demonstrates

- **A 4-step pipeline** — `fetch → extract → embed → persist` — kicked off from a
  submit form and advanced by a worker tick.
- **Retries with backoff.** The `embed` step is deliberately flaky: it fails its
  first attempt with a real, transient provider error and succeeds on retry. The
  attempt count (`2/3`) and the backoff window are visible in the UI.
- **Honest terminal failures.** Toggle *Force embed failure* and the step
  exhausts all three attempts, the run ends `failed`, and the real error is
  surfaced — no silent fallback or fake default.
- **Enforced timeouts.** Toggle *Simulate step timeout* and the `extract` step
  stalls; its timeout aborts it per policy instead of hanging forever.
- **Durable run state.** Run state is persisted server-side and survives a page
  refresh, confirming the full UI → API → workflow → datastore round-trip.
- **Live dashboard.** `/runs/[id]` polls the worker tick and renders the step
  timeline: status, per-attempt durations, backoff windows, and error messages.
- **BYOK AI insights.** An optional panel summarizes a run using *your own* LLM
  key (Anthropic / OpenAI / Google) via the Vercel AI SDK, called directly from
  the browser. Everything else works fully without a key.

## Routes

- `/` — submit form + recent runs
- `/runs/[id]` — run detail: step timeline, attempts, timings, errors
- `/settings` — BYOK provider / key / model
- `POST /api/runs` — start a run · `GET /api/runs/[id]` — fetch state ·
  `POST /api/runs/[id]/tick` — advance the worker

## Tech stack

Next.js (App Router) + TypeScript · Tailwind CSS · in-process workflow engine
with retry/backoff/timeout logic · Vercel AI SDK (BYOK) · Playwright for
behavioral tests.

## Run locally

```bash
pnpm install
pnpm exec playwright install --with-deps chromium   # first run only, for tests
pnpm dev                                             # http://localhost:3000
```

### Tests

Behavioral Playwright tests cover every acceptance criterion (pipeline success,
the flaky-embed retry, forced failure, timeout enforcement, persistence) plus
the BYOK gate (LLM is stubbed via a `mock` provider, so no real key is needed).

```bash
pnpm test
```

### Build

```bash
pnpm build
```

## Notes

- State is kept in-process (a process-global map) for the demo; the production
  model is SQLite/Prisma → pgvector. No native DB deps are bundled, so it
  deploys cleanly to Vercel.
- The `embed` step's embeddings are stubbed; the AI insights panel is the only
  feature that makes a live model call, and only with the visitor's own key.
