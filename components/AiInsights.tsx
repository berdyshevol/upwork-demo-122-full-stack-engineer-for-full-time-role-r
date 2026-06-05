"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { generateInsight, readByok, type Byok } from "@/lib/llm";
import type { Run } from "@/lib/types";
import { Button, Card } from "./ui";

function buildPrompt(run: Run): string {
  const steps = run.steps
    .map((s) => `${s.label}: ${s.status} (${s.attempt}/${s.maxAttempts})`)
    .join("; ");
  return [
    `Document: ${run.document}`,
    `Run status: ${run.status}.`,
    `Steps: ${steps}.`,
    "In 2-3 sentences, summarize what happened in this ingestion run and call",
    "out any retries or failures a reviewer should notice.",
  ].join("\n");
}

export function AiInsights({ run }: { run: Run }) {
  const [byok, setByok] = useState<Byok | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read BYOK after mount so SSR/CSR markup matches and we see localStorage.
  useEffect(() => {
    setByok(readByok());
  }, []);

  const enabled = byok !== null;

  async function run_() {
    if (!byok) return;
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      const text = await generateInsight(byok, buildPrompt(run));
      setOutput(text);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI request failed. Check your key."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI insights</h3>
        {enabled && (
          <span className="text-xs text-slate-500">
            via {byok?.provider} · {byok?.model}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Generate a plain-language summary of this run using your own LLM key
        (browser → provider direct; nothing is sent to our server).
      </p>

      {!enabled && (
        <p
          data-testid="ai-hint"
          className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-amber-300"
        >
          Choose a provider and paste your API key in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to enable live AI.
        </p>
      )}

      <div className="mt-4">
        <Button
          data-testid="ai-generate"
          onClick={run_}
          disabled={!enabled || busy}
        >
          {busy ? "Generating…" : "Generate insight"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {output && (
        <p
          data-testid="ai-output"
          className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
        >
          {output}
        </p>
      )}
    </Card>
  );
}
