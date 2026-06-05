// Domain types for the workflow engine. These mirror the Run/Step model in the
// PRD and are returned verbatim from the API routes so the UI can render the
// full timeline of attempts, timings and errors.

export type StepName = "fetch" | "extract" | "embed" | "persist";

export type StepStatus =
  | "queued"
  | "running"
  | "retrying"
  | "succeeded"
  | "failed";

export type RunStatus = "running" | "succeeded" | "failed";

export type AttemptStatus = "running" | "succeeded" | "failed" | "timeout";

export interface Attempt {
  n: number;
  status: AttemptStatus;
  startedAt: number;
  endedAt: number | null;
  error: string | null;
  // Backoff (ms) scheduled AFTER this attempt before the next one is started.
  backoffMs: number | null;
}

export interface Step {
  id: string;
  runId: string;
  name: StepName;
  label: string;
  description: string;
  status: StepStatus;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
  error: string | null;
  startedAt: number | null;
  endedAt: number | null;
  attempts: Attempt[];
  // Engine bookkeeping (kept on the record for honest, inspectable state).
  attemptStartedAt: number | null;
  nextAttemptAt: number | null;
}

export interface RunOptions {
  forceFail: boolean; // embed fails every attempt -> terminal failure
  simulateTimeout: boolean; // extract stalls and is aborted by its timeout
}

export interface Run {
  id: string;
  document: string;
  status: RunStatus;
  createdAt: number;
  finishedAt: number | null;
  options: RunOptions;
  steps: Step[];
}
