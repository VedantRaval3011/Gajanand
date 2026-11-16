import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";

export const dynamic = "force-dynamic";

// GET /api/health — is the database reachable from the server, and how fast?
// Open it while the app is failing to tell a database problem from a hosting one.
// Also safe to ping on a schedule to keep the free Atlas cluster from going idle.
export async function GET() {
  const started = Date.now();
  const coldConnection = mongoose.connection.readyState !== 1;
  try {
    await dbConnect();
    const connectMs = Date.now() - started;
    const pingStarted = Date.now();
    await mongoose.connection.db!.admin().command({ ping: 1 });
    return NextResponse.json(
      {
        ok: true,
        db: "up",
        coldConnection,
        connectMs,
        pingMs: Date.now() - pingStarted,
        region: process.env.VERCEL_REGION || "local",
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        coldConnection,
        afterMs: Date.now() - started,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        region: process.env.VERCEL_REGION || "local",
        time: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
