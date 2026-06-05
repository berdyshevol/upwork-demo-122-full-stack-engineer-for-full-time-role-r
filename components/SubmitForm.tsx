"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "./ui";

export function SubmitForm() {
  const router = useRouter();
  const [doc, setDoc] = useState("https://example.com/whitepaper.pdf");
  const [forceFail, setForceFail] = useState(false);
  const [simulateTimeout, setSimulateTimeout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: doc, forceFail, simulateTimeout }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const run = await res.json();
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Submit a document for processing</h2>
      <p className="mt-1 text-sm text-slate-400">
        Kicks off a 4-step pipeline — fetch → extract → embed → persist — with
        per-step retries, backoff and timeouts.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="doc"
            className="block text-sm font-medium text-slate-300"
          >
            Document URL or name
          </label>
          <input
            id="doc"
            data-testid="doc-input"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            placeholder="https://example.com/whitepaper.pdf"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm">
            <input
              data-testid="force-fail"
              type="checkbox"
              checked={forceFail}
              onChange={(e) => setForceFail(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Force embed failure</span>
              <span className="block text-xs text-slate-400">
                embed fails every attempt → terminal failure
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm">
            <input
              data-testid="simulate-timeout"
              type="checkbox"
              checked={simulateTimeout}
              onChange={(e) => setSimulateTimeout(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Simulate step timeout</span>
              <span className="block text-xs text-slate-400">
                extract stalls and is aborted by its timeout
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <Button data-testid="submit-run" type="submit" disabled={busy}>
          {busy ? "Starting…" : "Start ingestion run"}
        </Button>
      </form>
    </Card>
  );
}
