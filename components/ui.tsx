// Small, hand-rolled UI primitives in the shadcn/ui spirit (status badges,
// cards, buttons) — enough polish without pulling the interactive CLI generator.

import * as React from "react";
import type { RunStatus, StepStatus } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const styles: Record<string, string> = {
    primary:
      "bg-indigo-500 hover:bg-indigo-400 text-white disabled:bg-slate-700 disabled:text-slate-400",
    ghost:
      "bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-200",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-700/50 text-slate-300 border-slate-600",
  running: "bg-sky-500/15 text-sky-300 border-sky-600/50",
  retrying: "bg-amber-500/15 text-amber-300 border-amber-600/50",
  succeeded: "bg-emerald-500/15 text-emerald-300 border-emerald-600/50",
  failed: "bg-rose-500/15 text-rose-300 border-rose-600/50",
};

export function StatusBadge({
  status,
  className,
  ...rest
}: {
  status: StepStatus | RunStatus;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.queued,
        className
      )}
      {...rest}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
