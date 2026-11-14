import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const ticket = db.prepare("SELECT match_id AS matchId, status FROM queue_ticket WHERE user_id = ?").get(session.user.id) as { matchId: string | null; status: string } | undefined;
  if (!ticket?.matchId || (ticket.status !== "found" && ticket.status !== "accepted")) return NextResponse.json({ error: "No match to accept" }, { status: 409 });
  const accepted = db.transaction(() => {
    const match = db.prepare("SELECT status FROM game_match WHERE id = ?").get(ticket.matchId) as { status: string } | undefined;
    if (!match || match.status === "cancelled") return false;
    db.prepare("UPDATE match_player SET accepted_at = COALESCE(accepted_at, ?) WHERE match_id = ? AND user_id = ?").run(Date.now(), ticket.matchId, session.user.id);
    db.prepare("UPDATE queue_ticket SET status = 'accepted' WHERE user_id = ?").run(session.user.id);
    const pending = db.prepare("SELECT COUNT(*) AS count FROM match_player WHERE match_id = ? AND accepted_at IS NULL").get(ticket.matchId) as { count: number };
    if (pending.count === 0) db.prepare("UPDATE game_match SET status = 'ready' WHERE id = ?").run(ticket.matchId);
    return true;
  })();
  if (!accepted) return NextResponse.json({ error: "Match was cancelled" }, { status: 409 });
  return NextResponse.json({ accepted: true, matchId: ticket.matchId });
}
