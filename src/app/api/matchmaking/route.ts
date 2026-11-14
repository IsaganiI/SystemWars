import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";

export const runtime = "nodejs";
type Mode = "1v1" | "2v2" | "3v3";
type Ticket = { user_id: string; mode: Mode; status: "waiting" | "found" | "accepted" | "cancelled"; match_id: string | null; queued_at: number };
type Match = { status: "found" | "ready" | "cancelled" | "completed" };

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

function stateFor(id: string) {
  const ticket = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
  if (!ticket) return { status: "idle" };
  if (!ticket.match_id) return { status: ticket.status, mode: ticket.mode };
  const match = db.prepare("SELECT status FROM game_match WHERE id = ?").get(ticket.match_id) as Match | undefined;
  if (!match || match.status === "cancelled") return { status: "cancelled" };
  const players = db.prepare('SELECT p.user_id AS id, p.team, u.name FROM match_player p JOIN "user" u ON u.id = p.user_id WHERE p.match_id = ? ORDER BY p.team, u.name').all(ticket.match_id) as { id: string; team: number; name: string }[];
  return { status: match.status === "ready" ? "ready" : "found", mode: ticket.mode, matchId: ticket.match_id, players: players.map(player => ({ name: player.name, team: player.team, you: player.id === id })) };
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  db.prepare("UPDATE queue_ticket SET seen_at = ? WHERE user_id = ? AND status IN ('waiting', 'found', 'accepted')").run(Date.now(), id);
  return NextResponse.json(stateFor(id));
}

export async function POST(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!getPlayerProfile(id)) return NextResponse.json({ error: "Finish onboarding first" }, { status: 409 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const mode = typeof body === "object" && body !== null && "mode" in body ? body.mode : undefined;
  if (mode !== "1v1" && mode !== "2v2" && mode !== "3v3") return NextResponse.json({ error: "Choose a match format" }, { status: 400 });

  db.transaction(() => {
    const now = Date.now();
    db.prepare("DELETE FROM queue_ticket WHERE status = 'waiting' AND seen_at < ?").run(now - 15000);
    const existing = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
    if (existing?.status === "cancelled") db.prepare("DELETE FROM queue_ticket WHERE user_id = ?").run(id);
    else if (existing) return;
    db.prepare("INSERT INTO queue_ticket (user_id, mode, status, match_id, queued_at, seen_at) VALUES (?, ?, 'waiting', NULL, ?, ?)").run(id, mode, now, now);
    const teamSize = Number(mode[0]);
    const waiting = db.prepare("SELECT user_id FROM queue_ticket WHERE mode = ? AND status = 'waiting' ORDER BY queued_at, user_id LIMIT ?").all(mode, teamSize * 2) as { user_id: string }[];
    if (waiting.length < teamSize * 2) return;
    const matchId = randomUUID();
    db.prepare("INSERT INTO game_match (id, mode, challenge, status, created_at) VALUES (?, ?, 'ticket-onsale', 'found', ?)").run(matchId, mode, now);
    const addPlayer = db.prepare("INSERT INTO match_player (match_id, user_id, team, accepted_at) VALUES (?, ?, ?, NULL)");
    const markFound = db.prepare("UPDATE queue_ticket SET status = 'found', match_id = ? WHERE user_id = ?");
    waiting.forEach((player, index) => { addPlayer.run(matchId, player.user_id, index < teamSize ? 0 : 1); markFound.run(matchId, player.user_id); });
  })();
  return NextResponse.json(stateFor(id));
}

export async function DELETE(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  db.transaction(() => {
    const ticket = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
    if (!ticket) return;
    if (ticket.match_id) {
      db.prepare("UPDATE game_match SET status = 'cancelled' WHERE id = ? AND status = 'found'").run(ticket.match_id);
      db.prepare("UPDATE queue_ticket SET status = 'cancelled' WHERE match_id = ? AND status = 'found'").run(ticket.match_id);
    }
    db.prepare("DELETE FROM queue_ticket WHERE user_id = ?").run(id);
  })();
  return NextResponse.json({ status: "idle" });
}
