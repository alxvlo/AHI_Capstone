// DEV-ONLY: temporary upload endpoint used for capturing Chapter 4 screenshots.
// This file is created and deleted within a single session and is NOT part of the
// production app. It accepts a JPEG body and writes it to docs/chapter-4-figures/.
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUT_DIR = path.join(process.cwd(), "docs", "chapter-4-figures");

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "disabled in production" }, { status: 403 });
  }
  const name = req.headers.get("x-figure-name");
  if (!name || !/^[a-z0-9._-]+$/i.test(name)) {
    return NextResponse.json({ ok: false, error: "invalid x-figure-name header" }, { status: 400 });
  }
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "empty or oversized body" }, { status: 400 });
  }
  await mkdir(OUT_DIR, { recursive: true });
  const target = path.join(OUT_DIR, name);
  await writeFile(target, bytes);
  return NextResponse.json({ ok: true, path: target, bytes: bytes.length });
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: "screenshot upload route alive" });
}
