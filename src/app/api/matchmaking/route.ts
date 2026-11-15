import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
type Mode = "1v1" | "2v2" | "3v3";
type Ticket = { user_id: string; mode: Mode; status: "waiting" | "found" | "accepted" | "cancelled"; match_id: string | null; queued_at: number };
type Match = { status: "found" | "ready" | "cancelled" | "completed"; is_npc: number };

const NPC_WAIT_MS = 30_000;

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

function stateFor(id: string) {
  const ticket = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
  if (!ticket) return { status: "idle" };
  if (!ticket.match_id) return { status: ticket.status, mode: ticket.mode };
  const match = db.prepare("SELECT status, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(ticket.match_id) as Match | undefined;
  if (!match || match.status === "cancelled") return { status: "cancelled" };
  const players = db.prepare('SELECT p.user_id AS id, p.team, COALESCE(u."displayUsername", u.username, u.name) AS name FROM match_player p JOIN "user" u ON u.id = p.user_id WHERE p.match_id = ? ORDER BY p.team, u.name').all(ticket.match_id) as { id: string; team: number; name: string }[];
  const roster = players.map(player => ({ name: player.name, team: player.team, you: player.id === id }));
  if (match.is_npc) roster.push({ name: "SYSTEM AI", team: 1, you: false });
  return { status: match.status === "ready" ? "ready" : "found", mode: ticket.mode, matchId: ticket.match_id, isNpc: Boolean(match.is_npc), players: roster };
}

function pairWaiting(mode: Mode, now: number) {
  const teamSize = Number(mode[0]);
  const waiting = db.prepare(`SELECT q.user_id, q.queued_at, COALESCE(r.rating, 1000) AS rating
    FROM queue_ticket q LEFT JOIN player_rating r ON r.user_id = q.user_id AND r.mode = q.mode
    WHERE q.mode = ? AND q.status = 'waiting' ORDER BY q.queued_at, q.user_id LIMIT 200`)
    .all(mode) as { user_id: string; queued_at: number; rating: number }[];
  if (waiting.length < teamSize * 2) return;
  let group: typeof waiting | null = null;
  for (const seed of waiting) {
    const window = Math.min(1200, 200 + Math.floor((now - seed.queued_at) / 15000) * 100);
    const candidates = waiting.filter(player => Math.abs(player.rating - seed.rating) <= window)
      .sort((a, b) => Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) || a.queued_at - b.queued_at);
    if (candidates.length >= teamSize * 2) { group = candidates.slice(0, teamSize * 2); break; }
  }
  if (!group) return;
  const matchId = randomUUID();
  db.prepare("INSERT INTO game_match (id, mode, challenge, status, created_at) VALUES (?, ?, 'ticket-onsale', 'found', ?)").run(matchId, mode, now);
  const addPlayer = db.prepare("INSERT INTO match_player (match_id, user_id, team, accepted_at) VALUES (?, ?, ?, NULL)");
  const markFound = db.prepare("UPDATE queue_ticket SET status = 'found', match_id = ? WHERE user_id = ?");
  const teamTotal = [0, 0];
  const teamCount = [0, 0];
  for (const player of group.sort((a, b) => b.rating - a.rating)) {
    const team = teamCount[0] >= teamSize ? 1 : teamCount[1] >= teamSize ? 0 : teamTotal[0] <= teamTotal[1] ? 0 : 1;
    addPlayer.run(matchId, player.user_id, team);
    markFound.run(matchId, player.user_id);
    teamTotal[team] += player.rating;
    teamCount[team]++;
  }
}

function offerNpc(userId: string, now: number) {
  const ticket = db.prepare("SELECT mode, queued_at FROM queue_ticket WHERE user_id = ? AND status = 'waiting'").get(userId) as Pick<Ticket, "mode" | "queued_at"> | undefined;
  if (!ticket || ticket.mode !== "1v1" || now - ticket.queued_at < NPC_WAIT_MS) return;
  const matchId = randomUUID();
  db.prepare("INSERT INTO game_match (id, mode, challenge, status, created_at, is_npc) VALUES (?, '1v1', 'ticket-onsale', 'found', ?, 1)").run(matchId, now);
  db.prepare("INSERT INTO match_player (match_id, user_id, team, accepted_at) VALUES (?, ?, 0, NULL)").run(matchId, userId);
  db.prepare("UPDATE queue_ticket SET status = 'found', match_id = ? WHERE user_id = ? AND status = 'waiting'").run(matchId, userId);
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  db.transaction(() => {
    const now = Date.now();
    db.prepare("UPDATE queue_ticket SET seen_at = ? WHERE user_id = ? AND status IN ('waiting', 'found', 'accepted')").run(now, id);
    db.prepare("DELETE FROM queue_ticket WHERE status = 'waiting' AND seen_at < ?").run(now - 15000);
    const ticket = db.prepare("SELECT mode, status FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
    if (ticket?.status === "waiting") { pairWaiting(ticket.mode, now); offerNpc(id, now); }
  })();
  return NextResponse.json(stateFor(id));
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
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
    pairWaiting(mode, now);
  })();
  return NextResponse.json(stateFor(id));
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
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
