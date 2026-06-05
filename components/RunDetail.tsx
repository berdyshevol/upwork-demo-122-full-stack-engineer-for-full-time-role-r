"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Run } from "@/lib/types";
import { AiInsights } from "./AiInsights";
import { StepTimeline } from "./StepTimeline";
import { Card, StatusBadge } from "./ui";

const TICK_MS = 300;

export function RunDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [run, setRun] = useState<Run | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    function clear() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    // One worker tick. The tick response IS the latest persisted state, so a
    // single round-trip both advances the engine and refreshes the UI. Ticking
    // a terminal run is a no-op server-side, so this also handles page reloads.
    async function tick() {
      try {
        const res = await fetch(`/api/runs/${id}/tick`, {
          method: "POST",
          cache: "no-store",
        });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          clear();
          return;
        }
        if (!res.ok) return;
        const data: Run = await res.json();
        if (cancelled) return;
        setRun(data);
        if (data.status !== "running") clear();
      } catch {
        // transient — the next tick retries.
      }
    }

    tick();
    interval = setInterval(tick, TICK_MS);

    return () => {
      cancelled = true;
      clear();
    };
  }, [id]);

  if (notFound) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-300">
          Run <span className="font-mono">{id}</span> was not found. It may have
          expired.{" "}
          <Link href="/" className="text-indigo-400 underline">
            Start a new one
          </Link>
          .
        </p>
      </Card>
    );
  }

  if (!run) {
    return <p className="text-sm text-slate-400">Loading run…</p>;
  }

  const elapsed =
    (run.finishedAt ?? Date.now()) - run.createdAt;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-indigo-400 hover:underline">
          ← All runs
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{run.document}</h1>
            <p className="font-mono text-xs text-slate-500">run {run.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {(elapsed / 1000).toFixed(1)}s elapsed
            </span>
            <StatusBadge status={run.status} data-testid="run-status" />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {run.steps.map((step) => (
          <StepTimeline key={step.id} step={step} />
        ))}
      </div>

      <AiInsights run={run} />
    </div>
  );
}
