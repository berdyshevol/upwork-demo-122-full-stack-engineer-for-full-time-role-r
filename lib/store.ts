// In-memory run store. The PRD targets SQLite/Prisma in production; for this
// Vercel demo we keep state in a process-global Map (the hard constraints permit
// in-memory state and forbid native DB deps in the bundle). State persists for
// the lifetime of the serverless instance, which is what the "survives a page
// refresh" acceptance criterion exercises. A `globalThis` slot keeps the Map
// stable across Next.js dev hot-reloads.

import type { Run } from "./types";

const g = globalThis as unknown as { __runStore?: Map<string, Run> };

const store: Map<string, Run> = (g.__runStore ??= new Map<string, Run>());

export function saveRun(run: Run): void {
  store.set(run.id, run);
}

export function getRun(id: string): Run | undefined {
  return store.get(id);
}

export function listRuns(): Run[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}
