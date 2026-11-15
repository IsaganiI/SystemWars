import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeMatch } from "@/lib/match-results";
import { isSameOrigin } from "@/lib/request-security";
import type { SharedCanvas } from "@/lib/shared-canvas";

export const runtime = "nodejs";
const allowed = new Set(["app", "cache", "queue", "replica"]);
const nodeKinds = new Set(["client", "dns", "cdn", "gateway", "balancer", "waf", "websocket", "app", "worker", "function", "container", "payment", "transcoder", "scheduler", "cache", "database", "nosql", "replica", "storage", "search", "queue", "stream", "pubsub", "limiter", "auth", "breaker", "metrics", "logs", "custom"]);
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const point = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;

function validDesign(value: unknown): value is Record<string, unknown> {
  if (!record(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.notes) || !Array.isArray(value.strokes)) return false;
  if (value.nodes.length < 2 || value.edges.length < 1 || value.nodes.length > 80 || value.edges.length > 160 || value.notes.length > 30 || value.strokes.length > 80) return false;
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!record(node) || typeof node.id !== "string" || node.id.length > 80 || ids.has(node.id) || !nodeKinds.has(String(node.kind)) || typeof node.name !== "string" || node.name.length > 50 || !point(node.x, 820) || !point(node.y, 560) || (node.description !== undefined && (typeof node.description !== "string" || node.description.length > 140))) return false;
    ids.add(node.id);
  }
  return value.edges.every(edge => record(edge) && typeof edge.from === "string" && typeof edge.to === "string" && edge.from !== edge.to && ids.has(edge.from) && ids.has(edge.to))
    && value.notes.every(note => record(note) && typeof note.id === "string" && note.id.length <= 80 && point(note.x, 960) && point(note.y, 640) && typeof note.text === "string" && note.text.length <= 200)
    && value.strokes.every(stroke => record(stroke) && typeof stroke.id === "string" && stroke.id.length <= 80 && point(stroke.x1, 960) && point(stroke.y1, 640) && point(stroke.x2, 960) && point(stroke.y2, 640));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const match = db.prepare("SELECT status FROM game_match WHERE id = ? AND is_test = 0").get(id) as { status: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(id, session.user.id) as { team: number } | undefined;
  if (!match || match.status !== "ready" || !player) return NextResponse.json({ error: "Match is not ready" }, { status: 403 });
  const veto = db.prepare("SELECT selected_scenario FROM match_veto WHERE match_id = ?").get(id) as { selected_scenario: string | null } | undefined;
  if (!veto?.selected_scenario) return NextResponse.json({ error: "Complete the veto first" }, { status: 409 });
  const briefing = db.prepare(`SELECT COUNT(*) AS total, COUNT(r.user_id) AS ready
    FROM match_player p LEFT JOIN match_brief_ready r ON r.match_id = p.match_id AND r.user_id = p.user_id
    WHERE p.match_id = ?`).get(id) as { total: number; ready: number };
  if (briefing.total === 0 || briefing.ready < briefing.total) {
    return NextResponse.json({ error: "Wait for all players to confirm the scenario briefing" }, { status: 409 });
  }
  const result = db.transaction(() => {
    const saved = db.prepare("SELECT document FROM match_canvas WHERE match_id = ? AND team = ?").get(id, player.team) as { document: string } | undefined;
    if (!saved) return { error: "Wait for your canvas to save", status: 409 } as const;
    const canvas = JSON.parse(saved.document) as SharedCanvas;
    const design = {
      nodes: canvas.nodes.map(node => ({ id: node.id, kind: node.componentId, name: node.name ?? node.componentId, x: node.x * 8.2, y: node.y * 5.6, ...(node.description ? { description: node.description } : {}) })),
      edges: canvas.edges.map(edge => ({ from: edge.from, to: edge.to })),
      notes: canvas.notes.map(note => ({ id: String(note.id), x: note.x * 9.6, y: note.y * 6.4, text: note.text })),
      strokes: canvas.strokes.map(stroke => ({ id: String(stroke.id), x1: stroke.start.x * 9.6, y1: stroke.start.y * 6.4, x2: stroke.end.x * 9.6, y2: stroke.end.y * 6.4 })),
    };
    if (!validDesign(design)) return { error: "Connect at least two components before submitting", status: 400 } as const;
    const components = [...new Set(canvas.nodes.map(node => node.componentId).filter(kind => allowed.has(kind)))];
    db.prepare("INSERT INTO match_design (match_id, team, components, design, submitted_by, submitted_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(match_id, team) DO NOTHING")
      .run(id, player.team, JSON.stringify(components), JSON.stringify(design), session.user.id, Date.now());
    db.prepare("DELETE FROM queue_ticket WHERE match_id = ? AND user_id IN (SELECT user_id FROM match_player WHERE match_id = ? AND team = ?)")
      .run(id, id, player.team);
    return { submitted: true, completed: completeMatch(id), matchId: id } as const;
  })();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
