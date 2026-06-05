"use client";

import type { Attempt, Step } from "@/lib/types";
import { Card, StatusBadge } from "./ui";

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function attemptDuration(a: Attempt): string {
  if (a.endedAt === null) return "running…";
  return fmtMs(a.endedAt - a.startedAt);
}

function AttemptRow({ step, attempt }: { step: Step; attempt: Attempt }) {
  return (
    <li
      data-testid={`attempt-row-${attempt.n}`}
      className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-500">
          attempt {attempt.n}/{step.maxAttempts}
        </span>
        <StatusBadge status={attempt.status === "timeout" ? "failed" : attempt.status} />
        <span className="text-xs text-slate-500">{attemptDuration(attempt)}</span>
      </div>
      <div className="text-xs">
        {attempt.error && (
          <span className="text-rose-300">{attempt.error}</span>
        )}
        {attempt.backoffMs !== null && (
          <span className="ml-2 text-amber-300">
            ↻ backoff {fmtMs(attempt.backoffMs)} before retry
          </span>
        )}
      </div>
    </li>
  );
}

export function StepTimeline({ step }: { step: Step }) {
  const attemptLabel = `${Math.max(step.attempt, 0)} / ${step.maxAttempts}`;
  return (
    <Card className="p-5" data-testid={`step-${step.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{step.label}</h3>
            <StatusBadge
              status={step.status}
              data-testid={`step-status-${step.name}`}
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{step.description}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div data-testid={`attempt-count-${step.name}`}>
            attempts {attemptLabel}
          </div>
          <div>timeout {fmtMs(step.timeoutMs)}</div>
        </div>
      </div>

      {step.error && step.status === "failed" && (
        <p
          data-testid={`step-error-${step.name}`}
          className="mt-3 rounded-lg border border-rose-700/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
        >
          {step.error}
        </p>
      )}

      {step.attempts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {step.attempts.map((a) => (
            <AttemptRow key={a.n} step={step} attempt={a} />
          ))}
        </ul>
      )}
    </Card>
  );
}
