import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

type Access = { userId: string; team: number; mode: string; matchId: string };

function iceServers() {
  const servers: { urls: string[]; username?: string; credential?: string }[] = [];
  const stun = process.env.SYSTEMWARS_STUN_URLS?.split(",").map(value => value.trim()).filter(Boolean) ?? ["stun:stun.l.google.com:19302"];
  if (stun.length) servers.push({ urls: stun });
  const turn = process.env.SYSTEMWARS_TURN_URLS?.split(",").map(value => value.trim()).filter(Boolean) ?? [];
  if (turn.length && process.env.SYSTEMWARS_TURN_USERNAME && process.env.SYSTEMWARS_TURN_CREDENTIAL) {
    servers.push({ urls: turn, username: process.env.SYSTEMWARS_TURN_USERNAME, credential: process.env.SYSTEMWARS_TURN_CREDENTIAL });
  }
  return servers;
}

async function access(request: Request, matchId: string): Promise<Access | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const match = db.prepare("SELECT mode FROM game_match WHERE id = ? AND status = 'ready' AND is_npc = 0 AND is_test = 0").get(matchId) as { mode: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  // Voice is team-only: opponents never hear each other, so a 1v1 has no voice channel.
  if (!match || !player || match.mode === "1v1") return null;
  return { userId: session.user.id, team: player.team, mode: match.mode, matchId };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await access(request, (await params).id);
  if (!player) return NextResponse.json({ error: "Voice chat is unavailable" }, { status: 403 });
  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
  if (!Number.isSafeInteger(after) || after < 0) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  const now = Date.now();
  db.prepare("UPDATE voice_presence SET seen_at = ? WHERE match_id = ? AND user_id = ?").run(now, player.matchId, player.userId);
  db.prepare("DELETE FROM voice_presence WHERE seen_at < ?").run(now - 15000);
  db.prepare("DELETE FROM voice_signal WHERE created_at < ?").run(now - 300000);
  const peers = db.prepare(`SELECT p.user_id AS id, COALESCE(u."displayUsername", u.username, u.name) AS handle
    FROM match_player p JOIN voice_presence v ON v.match_id = p.match_id AND v.user_id = p.user_id
    JOIN user u ON u.id = p.user_id
    WHERE p.match_id = ? AND p.user_id != ? AND p.team = ? AND v.seen_at >= ?`)
    .all(player.matchId, player.userId, player.team, now - 15000) as { id: string; handle: string }[];
  const signals = db.prepare("SELECT id, from_user AS fromUser, kind, payload FROM voice_signal WHERE match_id = ? AND to_user = ? AND id > ? ORDER BY id LIMIT 100")
    .all(player.matchId, player.userId, after) as { id: number; fromUser: string; kind: string; payload: string }[];
  return NextResponse.json({ peers, signals: signals.map(signal => ({ ...signal, payload: JSON.parse(signal.payload) })), iceServers: iceServers() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const player = await access(request, (await params).id);
  if (!player) return NextResponse.json({ error: "Voice chat is unavailable" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 30000) return NextResponse.json({ error: "Signal too large" }, { status: 400 });
  let body: { action?: unknown; to?: unknown; kind?: unknown; payload?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid voice request" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid voice request" }, { status: 400 });
  if (body.action === "join") {
    db.transaction(() => {
      db.prepare("DELETE FROM voice_signal WHERE match_id = ? AND to_user = ?").run(player.matchId, player.userId);
      db.prepare("INSERT INTO voice_presence (match_id, user_id, seen_at) VALUES (?, ?, ?) ON CONFLICT(match_id,user_id) DO UPDATE SET seen_at = excluded.seen_at")
        .run(player.matchId, player.userId, Date.now());
    })();
    return NextResponse.json({ joined: true });
  }
  if (body.action === "leave") {
    db.prepare("DELETE FROM voice_presence WHERE match_id = ? AND user_id = ?").run(player.matchId, player.userId);
    return NextResponse.json({ joined: false });
  }
  if (body.action !== "signal" || typeof body.to !== "string" || body.to === player.userId || !["offer", "answer", "candidate"].includes(String(body.kind)) || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Invalid signal" }, { status: 400 });
  }
  const destination = db.prepare(`SELECT p.team FROM match_player p JOIN voice_presence v ON v.match_id = p.match_id AND v.user_id = p.user_id
    WHERE p.match_id = ? AND p.user_id = ? AND v.seen_at >= ?`).get(player.matchId, body.to, Date.now() - 15000) as { team: number } | undefined;
  if (!destination || destination.team !== player.team) return NextResponse.json({ error: "Player is not in this voice room" }, { status: 403 });
  const payload = JSON.stringify(body.payload);
  if (payload.length > 26000) return NextResponse.json({ error: "Signal too large" }, { status: 400 });
  db.prepare("INSERT INTO voice_signal (match_id, from_user, to_user, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(player.matchId, player.userId, body.to, body.kind, payload, Date.now());
  return NextResponse.json({ sent: true });
}
