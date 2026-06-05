import { RunsList } from "@/components/RunsList";
import { SubmitForm } from "@/components/SubmitForm";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          Multi-step document ingestion pipeline
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          A lightweight workflow engine that models a long-running process with
          retries, backoff, timeouts and async coordination — the same patterns
          behind a Temporal-style orchestrator. Each run advances through{" "}
          <span className="font-medium text-slate-200">fetch</span> →{" "}
          <span className="font-medium text-slate-200">extract</span> →{" "}
          <span className="font-medium text-slate-200">embed</span> →{" "}
          <span className="font-medium text-slate-200">persist</span>. The embed
          step is deliberately flaky so you can watch a retry recover, or force a
          terminal failure.
        </p>
      </section>

      <SubmitForm />
      <RunsList />
    </div>
  );
}
