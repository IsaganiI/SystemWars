import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import { PACE } from "@/lib/match-pace";
import { completeMatch } from "@/lib/match-results";
import { emptyCanvas, type SharedCanvas } from "@/lib/shared-canvas";

/** Server time in ms. A named helper so server components can read the clock without an impure call in render. */
export function serverTime() {
  return Date.now();
}

export type BuildClock = { buildStartsAt: number; buildEndsAt: number; submitClosesAt: number };

/** Allowed simple component ids, stored alongside the full design for history views. */
const simpleComponents = new Set(["app", "cache", "queue", "replica"]);

/**
 * The build window for a match. It starts when the last player confirms the brief, so every player gets the
 * full build time. Returns null until everyone has confirmed.
 */
export function buildClock(matchId: string): BuildClock | null {
  const match = db.prepare("SELECT mode FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { mode: Mode } | undefined;
  if (!match) return null;
  const brief = db.prepare(`SELECT COUNT(*) AS total, COUNT(r.user_id) AS ready, MAX(r.ready_at) AS lastReady
    FROM match_player p LEFT JOIN match_brief_ready r ON r.match_id = p.match_id AND r.user_id = p.user_id
    WHERE p.match_id = ?`).get(matchId) as { total: number; ready: number; lastReady: number | null };
  if (!brief.total || brief.ready < brief.total || brief.lastReady === null) return null;
  const buildEndsAt = brief.lastReady + PACE.buildSeconds[match.mode] * 1000;
  return { buildStartsAt: brief.lastReady, buildEndsAt, submitClosesAt: buildEndsAt + PACE.submitGraceSeconds * 1000 };
}

/** Converts a team's saved canvas into the stored design format (the same scale the submit route uses). */
export function canvasToDesign(canvas: SharedCanvas) {
  return {
    nodes: canvas.nodes.map(node => ({ id: node.id, kind: node.componentId, name: node.name ?? node.componentId, x: node.x * 8.2, y: node.y * 5.6, ...(node.description ? { description: node.description } : {}) })),
    edges: canvas.edges.map(edge => ({ from: edge.from, to: edge.to })),
    notes: canvas.notes.map(note => ({ id: String(note.id), x: note.x * 9.6, y: note.y * 6.4, text: note.text })),
    strokes: canvas.strokes.map(stroke => ({ id: String(stroke.id), x1: stroke.start.x * 9.6, y1: stroke.start.y * 6.4, x2: stroke.end.x * 9.6, y2: stroke.end.y * 6.4 })),
  };
}

export function canvasComponents(canvas: SharedCanvas) {
  return [...new Set(canvas.nodes.map(node => node.componentId).filter(kind => simpleComponents.has(kind)))];
}

/** Saves whatever a team has on its canvas as its design. Used for auto-submits and absent teams. Call inside a transaction. */
export function lockTeamDesign(matchId: string, team: number, submittedBy: string, now: number) {
  const saved = db.prepare("SELECT document FROM match_canvas WHERE match_id = ? AND team = ?").get(matchId, team) as { document: string } | undefined;
  const canvas: SharedCanvas = saved ? JSON.parse(saved.document) : emptyCanvas();
  const inserted = db.prepare("INSERT INTO match_design (match_id, team, components, design, submitted_by, submitted_at, auto_submitted) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(match_id, team) DO NOTHING")
    .run(matchId, team, JSON.stringify(canvasComponents(canvas)), JSON.stringify(canvasToDesign(canvas)), submittedBy, now);
  db.prepare("DELETE FROM queue_ticket WHERE match_id = ? AND user_id IN (SELECT user_id FROM match_player WHERE match_id = ? AND team = ?)").run(matchId, matchId, team);
  return inserted.changes > 0;
}

/**
 * Once the build time and grace period are over, locks in every team that has not submitted (using its saved
 * canvas, even if half built) and scores the match, so a match never stalls on an absent team.
 * Cheap to call on every poll: it does nothing until the deadline passes.
 */
export function enforceBuildDeadline(matchId: string, now = Date.now()) {
  const clock = buildClock(matchId);
  if (!clock || now <= clock.submitClosesAt) return clock;
  db.transaction(() => {
    const match = db.prepare("SELECT status FROM game_match WHERE id = ?").get(matchId) as { status: string } | undefined;
    if (match?.status !== "ready") return;
    const teams = db.prepare("SELECT DISTINCT team FROM match_player WHERE match_id = ?").all(matchId) as { team: number }[];
    for (const { team } of teams) lockTeamDesign(matchId, team, "system", now);
    completeMatch(matchId);
  })();
  return clock;
}
