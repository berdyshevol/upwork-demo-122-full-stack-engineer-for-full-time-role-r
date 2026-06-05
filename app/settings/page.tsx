"use client";

import { useEffect, useState } from "react";
import {
  PROVIDER_MODELS,
  readByok,
  type Provider,
} from "@/lib/llm";
import { Button, Card } from "@/components/ui";

type RealProvider = Exclude<Provider, "mock">;

export default function SettingsPage() {
  const [provider, setProvider] = useState<RealProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDER_MODELS.anthropic.models[0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = readByok();
    if (existing && existing.provider !== "mock") {
      setProvider(existing.provider as RealProvider);
      setApiKey(existing.apiKey);
      setModel(existing.model);
    }
  }, []);

  // Keep the model valid for the selected provider.
  function onProviderChange(next: RealProvider) {
    setProvider(next);
    setModel(PROVIDER_MODELS[next].models[0]);
    setSaved(false);
  }

  function save() {
    window.localStorage.setItem(
      "byok",
      JSON.stringify({ provider, apiKey, model })
    );
    setSaved(true);
  }

  function clear() {
    window.localStorage.removeItem("byok");
    setApiKey("");
    setProvider("anthropic");
    setModel(PROVIDER_MODELS.anthropic.models[0]);
    setSaved(false);
  }

  const label = PROVIDER_MODELS[provider].label;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Bring your own key. Keys are stored only in your browser&apos;s
          localStorage and used for direct browser → provider calls — they are
          never sent to or logged by this demo&apos;s server.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-slate-300"
          >
            Provider
          </label>
          <select
            id="provider"
            data-testid="provider-select"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as RealProvider)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {(Object.keys(PROVIDER_MODELS) as RealProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_MODELS[p].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="apikey"
            className="block text-sm font-medium text-slate-300"
          >
            {label} API key
          </label>
          <input
            id="apikey"
            data-testid="apikey-input"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setSaved(false);
            }}
            placeholder={`Paste your ${label} API key`}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-slate-300"
          >
            Model
          </label>
          <select
            id="model"
            data-testid="model-select"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {PROVIDER_MODELS[provider].models.map((m, i) => (
              <option key={m} value={m}>
                {m}
                {i === 0 ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button data-testid="save-byok" onClick={save}>
            Save
          </Button>
          <Button data-testid="clear-byok" variant="ghost" onClick={clear}>
            Clear
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400" data-testid="saved-msg">
              Saved.
            </span>
          )}
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Tip: the rest of the demo — the full ingestion pipeline with retries and
        timeouts — works without any key. Only the AI insights panel needs one.
      </p>
    </div>
  );
}
