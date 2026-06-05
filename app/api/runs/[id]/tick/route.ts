import { NextResponse } from "next/server";
import { advance } from "@/lib/engine";
import { getRun, saveRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/runs/[id]/tick — advance the worker by one tick and return the
// updated run state. This is what a Vercel Cron (or the client poller) calls to
// drive the asynchronous step machine forward.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  advance(run, Date.now());
  saveRun(run);
  return NextResponse.json(run);
}
