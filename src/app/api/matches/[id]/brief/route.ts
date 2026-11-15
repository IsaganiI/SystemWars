import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { buildClock } from "@/lib/build-clock";

export const runtime = "nodejs";

async function briefState(request: Request, matchId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: "Sign in required", status: 401 } as const;
  const match = db.prepare("SELECT status FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { status: string } | undefined;
  const participant = db.prepare("SELECT 1 FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id);
  if (!match || !participant) return { error: "Match not found", status: 404 } as const;
  if (match.status !== "ready") return { error: "Match is not ready", status: 409 } as const;
  const veto = db.prepare("SELECT selected_scenario FROM match_veto WHERE match_id = ?").get(matchId) as { selected_scenario: string | null } | undefined;
  if (!veto?.selected_scenario) return { error: "Complete the veto first", status: 409 } as const;
  const counts = db.prepare(`SELECT COUNT(*) AS total, COUNT(r.user_id) AS ready
    FROM match_player p LEFT JOIN match_brief_ready r ON r.match_id = p.match_id AND r.user_id = p.user_id
    WHERE p.match_id = ?`).get(matchId) as { total: number; ready: number };
  const ownReady = Boolean(db.prepare("SELECT 1 FROM match_brief_ready WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id));
  const total = counts.total;
  const ready = counts.ready;
  const allReady = total > 0 && ready >= total;
  return { userId: session.user.id, matchId, ownReady, ready, total, allReady, serverNow: Date.now(), buildEndsAt: allReady ? buildClock(matchId)?.buildEndsAt ?? null : null } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await briefState(request, (await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ownReady: result.ownReady, ready: result.ready, total: result.total, allReady: result.allReady, serverNow: result.serverNow, buildEndsAt: result.buildEndsAt });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const result = await briefState(request, (await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  db.prepare("INSERT OR IGNORE INTO match_brief_ready (match_id, user_id, ready_at) VALUES (?, ?, ?)").run(result.matchId, result.userId, Date.now());
  const updated = await briefState(request, result.matchId);
  if ("error" in updated) return NextResponse.json({ error: updated.error }, { status: updated.status });
  return NextResponse.json({ ownReady: updated.ownReady, ready: updated.ready, total: updated.total, allReady: updated.allReady, serverNow: updated.serverNow, buildEndsAt: updated.buildEndsAt });
}
