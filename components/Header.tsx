import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-indigo-400">⛓</span> Ingestion Pipeline
          </span>
          <span className="hidden text-xs text-slate-500 sm:inline">
            workflow orchestration demo
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-300 hover:text-white">
            Runs
          </Link>
          <Link href="/settings" className="text-slate-300 hover:text-white">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
