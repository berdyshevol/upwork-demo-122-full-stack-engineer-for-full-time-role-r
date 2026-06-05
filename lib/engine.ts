// A minimal in-process workflow engine that mirrors Temporal-style semantics:
// each step has a retry policy (max attempts + exponential backoff) and a
// timeout. Failures are recorded as discrete attempts and retried — never
// masked with a fake default. The engine is driven by a "worker tick" that
// advances the run based on wall-clock time, so progress survives across the
// stateless API calls that drive it.

import type { Attempt, Run, RunOptions, Step, StepName } from "./types";

// Timing constants. Kept small so a full run is demoable (and testable) in a
// few seconds while still showing real durations and backoff windows.
const WORK_MS = 250; // simulated work per attempt
const TIMEOUT_MS = 6000; // default per-step timeout
const TIMEOUT_STALL_MS = 1000; // tighter timeout for the stalled-step demo
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 400; // backoff after attempt n = BASE * 2^(n-1)

const STEP_DEFS: { name: StepName; label: string; description: string }[] = [
  { name: "fetch", label: "Fetch", description: "Fetch document from source URL" },
  { name: "extract", label: "Extract", description: "Extract text & metadata" },
  { name: "embed", label: "Embed", description: "Generate vector embeddings" },
  { name: "persist", label: "Persist", description: "Persist chunks & vectors" },
];

function backoffFor(attempt: number): number {
  return BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
}

function timeoutFor(step: Step, run: Run): number {
  if (step.name === "extract" && run.options.simulateTimeout) {
    return TIMEOUT_STALL_MS;
  }
  return step.timeoutMs;
}

// How long an attempt's simulated work takes. The stalled extract step never
// finishes on its own, so its timeout is the only thing that can stop it.
function workMsFor(step: Step, run: Run): number {
  if (step.name === "extract" && run.options.simulateTimeout) {
    return Number.POSITIVE_INFINITY;
  }
  return WORK_MS;
}

// Deterministic outcome of a completed attempt (i.e. work finished before any
// timeout fired). The flaky embed step fails its first attempt with a real,
// transient provider error and succeeds on retry; forceFail makes it fail every
// time so it exhausts its retries and becomes a terminal failure.
function decideResult(
  step: Step,
  run: Run,
  attempt: number
): { ok: true } | { ok: false; error: string } {
  if (step.name === "embed") {
    if (run.options.forceFail) {
      return {
        ok: false,
        error:
          "Embedding provider returned 503 (model unavailable). Pipeline aborted — no fallback vector written.",
      };
    }
    if (attempt < 2) {
      return {
        ok: false,
        error:
          "Embedding provider returned 503 (model warming up) — transient, retrying.",
      };
    }
  }
  return { ok: true };
}

export function createRun(document: string, options: RunOptions, now: number): Run {
  const id = newId();
  const steps: Step[] = STEP_DEFS.map((def, i) => ({
    id: `${id}-${i}`,
    runId: id,
    name: def.name,
    label: def.label,
    description: def.description,
    status: "queued",
    attempt: 0,
    maxAttempts: MAX_ATTEMPTS,
    timeoutMs: TIMEOUT_MS,
    error: null,
    startedAt: null,
    endedAt: null,
    attempts: [],
    attemptStartedAt: null,
    nextAttemptAt: null,
  }));
  return {
    id,
    document,
    status: "running",
    createdAt: now,
    finishedAt: null,
    options,
    steps,
  };
}

function beginAttempt(step: Step, attemptNumber: number, now: number) {
  step.status = "running";
  step.attempt = attemptNumber;
  step.attemptStartedAt = now;
  step.nextAttemptAt = null;
  if (step.startedAt === null) step.startedAt = now;
  const record: Attempt = {
    n: attemptNumber,
    status: "running",
    startedAt: now,
    endedAt: null,
    error: null,
    backoffMs: null,
  };
  step.attempts.push(record);
}

function failAttempt(
  step: Step,
  run: Run,
  now: number,
  error: string,
  kind: "failed" | "timeout"
) {
  const record = step.attempts[step.attempts.length - 1];
  record.status = kind;
  record.endedAt = now;
  record.error = error;
  step.error = error;

  if (step.attempt >= step.maxAttempts) {
    step.status = "failed";
    step.endedAt = now;
    run.status = "failed";
    run.finishedAt = now;
  } else {
    const backoff = backoffFor(step.attempt);
    record.backoffMs = backoff;
    step.status = "retrying";
    step.nextAttemptAt = now + backoff;
    step.attemptStartedAt = null;
  }
}

function succeedAttempt(step: Step, now: number) {
  const record = step.attempts[step.attempts.length - 1];
  record.status = "succeeded";
  record.endedAt = now;
  step.status = "succeeded";
  step.endedAt = now;
  step.error = null;
}

// Advance a run by one worker tick. Idempotent with respect to wall-clock time:
// calling it repeatedly only causes transitions once their time thresholds are
// crossed, so it is safe to drive from multiple pollers.
export function advance(run: Run, now: number): Run {
  if (run.status !== "running") return run;

  const step = run.steps.find((s) => s.status !== "succeeded");
  if (!step) {
    run.status = "succeeded";
    run.finishedAt = now;
    return run;
  }

  switch (step.status) {
    case "queued":
      beginAttempt(step, 1, now);
      break;

    case "retrying":
      if (step.nextAttemptAt !== null && now >= step.nextAttemptAt) {
        beginAttempt(step, step.attempt + 1, now);
      }
      break;

    case "running": {
      const elapsed = now - (step.attemptStartedAt ?? now);
      const to = timeoutFor(step, run);
      const wm = workMsFor(step, run);

      if (elapsed >= to && wm > to) {
        failAttempt(
          step,
          run,
          now,
          `Step "${step.label}" exceeded its ${to}ms timeout and was aborted.`,
          "timeout"
        );
      } else if (elapsed >= wm) {
        const result = decideResult(step, run, step.attempt);
        if (result.ok) {
          succeedAttempt(step, now);
        } else {
          failAttempt(step, run, now, result.error, "failed");
        }
      }
      // else: still working — stay running.
      break;
    }

    case "failed":
      // Safety: a failed step means the run is failed.
      run.status = "failed";
      if (run.finishedAt === null) run.finishedAt = now;
      break;
  }

  return run;
}

function newId(): string {
  // crypto.randomUUID is available in the Node.js runtime used by route handlers.
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `run_${Date.now().toString(36)}_${Math.floor(
      Math.random() * 1e6
    ).toString(36)}`;
  }
}
