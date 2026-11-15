import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyCanvasOperations, emptyCanvas, parseCanvasOperations, type SharedCanvas } from "@/lib/shared-canvas";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

async function participant(request: Request, matchId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: "Sign in required", status: 401 } as const;
  const match = db.prepare("SELECT status FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { status: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || !player) return { error: "Match not found", status: 404 } as const;
  if (match.status !== "ready" && match.status !== "completed") return { error: "Match is not active", status: 409 } as const;
  const veto = db.prepare("SELECT selected_scenario FROM match_veto WHERE match_id = ?").get(matchId) as { selected_scenario: string | null } | undefined;
  if (!veto?.selected_scenario) return { error: "Complete the veto first", status: 409 } as const;
  const briefing = db.prepare(`SELECT COUNT(*) AS total, COUNT(r.user_id) AS ready FROM match_player p
    LEFT JOIN match_brief_ready r ON r.match_id = p.match_id AND r.user_id = p.user_id WHERE p.match_id = ?`).get(matchId) as { total: number; ready: number };
  if (!briefing.total || briefing.ready < briefing.total) return { error: "Wait for the match brief", status: 409 } as const;
  return { userId: session.user.id, team: player.team, matchId, matchStatus: match.status } as const;
}

function readCanvas(matchId: string, team: number) {
  const row = db.prepare("SELECT document, revision FROM match_canvas WHERE match_id = ? AND team = ?").get(matchId, team) as { document: string; revision: number } | undefined;
  return row ? { canvas: JSON.parse(row.document) as SharedCanvas, revision: row.revision } : { canvas: emptyCanvas(), revision: 0 };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await participant(request, (await params).id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const state = readCanvas(access.matchId, access.team);
  const submitted = Boolean(db.prepare("SELECT 1 FROM match_design WHERE match_id = ? AND team = ?").get(access.matchId, access.team));
  return NextResponse.json({ ...state, submitted: submitted || access.matchStatus === "completed" }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await participant(request, (await params).id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.matchStatus !== "ready") return NextResponse.json({ error: "Match has ended" }, { status: 409 });
  const raw = await request.text();
  if (raw.length > 70000) return NextResponse.json({ error: "Canvas edit is too large" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid canvas edit" }, { status: 400 }); }
  const operations = parseCanvasOperations(body && typeof body === "object" && "operations" in body ? body.operations : null);
  if (!operations) return NextResponse.json({ error: "Invalid canvas edit" }, { status: 400 });
  const result = db.transaction(() => {
    const submitted = db.prepare("SELECT 1 FROM match_design WHERE match_id = ? AND team = ?").get(access.matchId, access.team);
    if (submitted) return null;
    const current = readCanvas(access.matchId, access.team);
    const canvas = applyCanvasOperations(current.canvas, operations);
    if (!canvas) return null;
    const revision = current.revision + 1;
    db.prepare(`INSERT INTO match_canvas (match_id, team, document, revision, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(match_id, team) DO UPDATE SET
      document = excluded.document, revision = excluded.revision, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
      .run(access.matchId, access.team, JSON.stringify(canvas), revision, access.userId, Date.now());
    return { canvas, revision };
  })();
  if (!result) return NextResponse.json({ error: "Canvas is locked or full" }, { status: 409 });
  return NextResponse.json(result);
}
