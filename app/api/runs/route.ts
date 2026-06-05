import { NextResponse } from "next/server";
import { createRun } from "@/lib/engine";
import { listRuns, saveRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/runs — start a new ingestion run.
export async function POST(req: Request) {
  let body: {
    document?: string;
    forceFail?: boolean;
    simulateTimeout?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults applied below.
  }

  const document = (body.document ?? "").trim();
  if (!document) {
    return NextResponse.json(
      { error: "A document URL or name is required to start a run." },
      { status: 400 }
    );
  }

  const run = createRun(
    document,
    {
      forceFail: Boolean(body.forceFail),
      simulateTimeout: Boolean(body.simulateTimeout),
    },
    Date.now()
  );
  saveRun(run);
  return NextResponse.json(run, { status: 201 });
}

// GET /api/runs — list recent runs.
export async function GET() {
  return NextResponse.json(listRuns());
}
