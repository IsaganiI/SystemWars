import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { cancelReadyCheck, expireReadyChecks, pairWaiting, readyCheckEndsAt } from "@/lib/matchmaking";

export const runtime = "nodejs";
type Mode = "1v1" | "2v2" | "3v3";
type Ticket = { user_id: string; mode: Mode; status: "waiting" | "found" | "accepted" | "cancelled"; match_id: string | null; queued_at: number };
type Match = { status: "found" | "ready" | "cancelled" | "completed"; is_npc: number; created_at: number };

const NPC_WAIT_MS = 30_000;

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

function stateFor(id: string) {
  const ticket = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
  if (!ticket) return { status: "idle" };
  if (!ticket.match_id) return { status: ticket.status, mode: ticket.mode };
  const match = db.prepare("SELECT status, is_npc, created_at FROM game_match WHERE id = ? AND is_test = 0").get(ticket.match_id) as Match | undefined;
  if (!match || match.status === "cancelled") return { status: "cancelled" };
  const players = db.prepare('SELECT p.user_id AS id, p.team, COALESCE(u."displayUsername", u.username, u.name) AS name FROM match_player p JOIN "user" u ON u.id = p.user_id WHERE p.match_id = ? ORDER BY p.team, u.name').all(ticket.match_id) as { id: string; team: number; name: string }[];
  const roster = players.map(player => ({ name: player.name, team: player.team, you: player.id === id }));
  if (match.is_npc) roster.push({ name: "SYSTEM AI", team: 1, you: false });
  return { status: match.status === "ready" ? "ready" : "found", mode: ticket.mode, matchId: ticket.match_id, isNpc: Boolean(match.is_npc), players: roster, serverNow: Date.now(), readyCheckEndsAt: readyCheckEndsAt(match.created_at) };
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
  expireReadyChecks();
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

  expireReadyChecks();
  db.transaction(() => {
    const now = Date.now();
    db.prepare("DELETE FROM queue_ticket WHERE status = 'waiting' AND seen_at < ?").run(now - 15000);
    const existing = db.prepare("SELECT * FROM queue_ticket WHERE user_id = ?").get(id) as Ticket | undefined;
    const existingMatch = existing?.match_id ? db.prepare("SELECT status FROM game_match WHERE id = ?").get(existing.match_id) as Pick<Match, "status"> | undefined : undefined;
    // A ticket whose match was cancelled is stale, whatever its own status says.
    if (existing?.status === "cancelled" || existingMatch?.status === "cancelled") db.prepare("DELETE FROM queue_ticket WHERE user_id = ?").run(id);
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
    // Remove the decliner first so cancelReadyCheck does not put them back in the queue.
    db.prepare("DELETE FROM queue_ticket WHERE user_id = ?").run(id);
    // Players who already accepted go back into the queue instead of getting stuck on a cancelled match.
    if (ticket.match_id) cancelReadyCheck(ticket.match_id);
  })();
  return NextResponse.json({ status: "idle" });
}
