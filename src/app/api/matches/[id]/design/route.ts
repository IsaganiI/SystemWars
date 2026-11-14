import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const allowed = new Set(["app", "cache", "queue", "replica"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const match = db.prepare("SELECT status FROM game_match WHERE id = ?").get(id) as { status: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(id, session.user.id) as { team: number } | undefined;
  if (!match || match.status !== "ready" || !player) return NextResponse.json({ error: "Match is not ready" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid design" }, { status: 400 }); }
  const components = typeof body === "object" && body !== null && "components" in body ? body.components : undefined;
  if (!Array.isArray(components) || components.length > 4 || new Set(components).size !== components.length || !components.every(value => typeof value === "string" && allowed.has(value))) {
    return NextResponse.json({ error: "Invalid components" }, { status: 400 });
  }
  db.transaction(() => {
    db.prepare("INSERT INTO match_design (match_id, team, components, submitted_by, submitted_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(match_id, team) DO NOTHING")
      .run(id, player.team, JSON.stringify(components), session.user.id, Date.now());
    db.prepare("DELETE FROM queue_ticket WHERE match_id = ? AND user_id IN (SELECT user_id FROM match_player WHERE match_id = ? AND team = ?)")
      .run(id, id, player.team);
  })();
  return NextResponse.json({ submitted: true, matchId: id });
}
