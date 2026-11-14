import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ profile: getPlayerProfile(session.user.id) ?? null });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const preferredMode = typeof body === "object" && body !== null && "preferredMode" in body ? body.preferredMode : undefined;
  if (preferredMode !== "1v1" && preferredMode !== "2v2" && preferredMode !== "3v3") {
    return NextResponse.json({ error: "Choose a match format" }, { status: 400 });
  }

  db.prepare("INSERT INTO player_profile (user_id, preferred_mode, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET preferred_mode = excluded.preferred_mode")
    .run(session.user.id, preferredMode, Date.now());
  return NextResponse.json({ preferredMode });
}
