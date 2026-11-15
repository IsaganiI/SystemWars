import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const matches = db.prepare(`SELECT m.id, m.mode, m.challenge, m.created_at AS createdAt,
    mine.score AS yourScore, theirs.score AS rivalScore, COALESCE(change.delta, 0) AS ratingDelta,
    COALESCE(change.result, CASE WHEN mine.score > theirs.score THEN 'win' WHEN mine.score < theirs.score THEN 'loss' ELSE 'draw' END) AS result,
    m.is_npc AS isNpc
    FROM game_match m JOIN match_player p ON p.match_id = m.id
    JOIN match_result mine ON mine.match_id = m.id AND mine.team = p.team
    JOIN match_result theirs ON theirs.match_id = m.id AND theirs.team != p.team
    LEFT JOIN rating_change change ON change.match_id = m.id AND change.user_id = p.user_id
    WHERE p.user_id = ? AND m.status = 'completed' ORDER BY m.created_at DESC LIMIT 50`).all(session.user.id);
  return NextResponse.json({ matches });
}
