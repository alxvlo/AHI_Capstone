// TEMP ROUTE — created during Chapter 4 screenshot capture session and now disabled.
// This file should be deleted before any code review or commit. It is left as a
// no-op stub because the workspace mount does not permit deletion from this side.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: false, error: "endpoint disabled — delete this file" }, { status: 410 });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "endpoint disabled — delete this file" }, { status: 410 });
}
