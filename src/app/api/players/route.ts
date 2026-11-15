import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 50) return NextResponse.json({ error: "Search is too long" }, { status: 400 });
  const players = db.prepare(`SELECT u.id, COALESCE(u."displayUsername", u.username, u.name) AS handle,
    r.rating, r.wins, r.losses,
    f.status AS friendshipStatus, f.requested_by AS requestedBy,
    COALESCE(fs.requests, 'code') = 'anyone' AS acceptsRequests
    FROM user u JOIN player_profile p ON p.user_id = u.id
    LEFT JOIN player_rating r ON r.user_id = u.id AND r.mode = '1v1'
    LEFT JOIN friend_settings fs ON fs.user_id = u.id
    LEFT JOIN friendship f ON f.user_a = min(u.id, ?) AND f.user_b = max(u.id, ?)
    WHERE u.id != ? AND instr(lower(COALESCE(u."displayUsername", u.username, u.name)), lower(?)) > 0
    ORDER BY COALESCE(r.rating, 1000) DESC, handle LIMIT 30`)
    .all(session.user.id, session.user.id, session.user.id, query);
  return NextResponse.json({ players: (players as { acceptsRequests: number }[]).map(player => ({ ...player, acceptsRequests: Boolean(player.acceptsRequests) })) });
}
