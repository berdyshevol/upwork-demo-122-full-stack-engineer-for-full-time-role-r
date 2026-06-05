"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Run } from "@/lib/types";
import { Card, StatusBadge } from "./ui";

function stepSummary(run: Run): string {
  const done = run.steps.filter((s) => s.status === "succeeded").length;
  return `${done}/${run.steps.length} steps`;
}

export function RunsList() {
  const [runs, setRuns] = useState<Run[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/runs", { cache: "no-store" });
        const data: Run[] = await res.json();
        if (alive) setRuns(data);
      } catch {
        // transient — keep last good state.
      }
    }
    poll();
    const t = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Recent runs</h2>
      {runs === null ? (
        <p className="mt-3 text-sm text-slate-400">Loading…</p>
      ) : runs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400" data-testid="no-runs">
          No runs yet. Submit a document above to start one.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/runs/${run.id}`}
                data-testid="run-row"
                className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{run.document}</p>
                  <p className="text-xs text-slate-500">
                    {stepSummary(run)} · {new Date(run.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
