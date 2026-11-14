import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const matches = db.prepare("SELECT m.id, m.mode, m.challenge, m.created_at AS createdAt FROM game_match m JOIN match_player p ON p.match_id = m.id WHERE p.user_id = ? AND m.status = 'completed' ORDER BY m.created_at DESC LIMIT 50").all(session.user.id);
  return NextResponse.json({ matches });
}
