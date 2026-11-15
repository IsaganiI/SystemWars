import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MatchExperience } from "@/components/match-experience";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import { ensureVeto } from "@/lib/veto";
import { vetoScenarios } from "@/lib/veto-scenarios";
import { matchBriefs } from "@/lib/match-scenarios";
import { rankTone } from "@/lib/rank-tone";
import { emptyCanvas, type SharedCanvas } from "@/lib/shared-canvas";
import { enforceBuildDeadline, serverTime } from "@/lib/build-clock";

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const matchId = (await searchParams).id;
  if (!matchId) redirect("/play");
  const match = db.prepare("SELECT mode, status, challenge, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { mode: Mode; status: string; challenge: string; is_npc: number } | undefined;
  const participant = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || !participant) redirect("/play");
  if (match.status === "completed") redirect(`/results?id=${encodeURIComponent(matchId)}`);
  if (match.status !== "ready") redirect("/play");
  const veto = ensureVeto(matchId);
  if (!veto.selected_scenario) redirect(`/veto?id=${encodeURIComponent(matchId)}`);
  // Locks in absent teams once the build time is over, so a late arrival is sent to the result.
  const clock = enforceBuildDeadline(matchId);
  const submitted = db.prepare("SELECT 1 FROM match_design WHERE match_id = ? AND team = ?").get(matchId, participant.team);
  if (submitted) redirect(`/results?id=${encodeURIComponent(matchId)}`);
  const handle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  const players = db.prepare(`SELECT mp.team, COALESCE(u."displayUsername", u.username, u.name) AS handle
    FROM match_player mp JOIN user u ON u.id = mp.user_id WHERE mp.match_id = ? ORDER BY mp.accepted_at, mp.user_id`)
    .all(matchId) as { team: number; handle: string }[];
  const opponents = match.is_npc ? ["SYSTEM AI"] : players.filter(player => player.team !== participant.team).map(player => player.handle);
  const scenario = vetoScenarios.find(item => item.id === match.challenge);
  const readyCount = db.prepare(`SELECT COUNT(r.user_id) AS total FROM match_player p
    LEFT JOIN match_brief_ready r ON r.match_id = p.match_id AND r.user_id = p.user_id
    WHERE p.match_id = ?`).get(matchId) as { total: number };
  const ownReady = Boolean(db.prepare("SELECT 1 FROM match_brief_ready WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id));
  const total = players.length;
  const ready = readyCount.total;
  const ratingRow = db.prepare("SELECT rating FROM player_rating WHERE user_id = ? AND mode = ?").get(session.user.id, match.mode) as { rating: number } | undefined;
  const brief = matchBriefs[scenario?.id ?? "ticket-onsale"];
  const canvasRow = db.prepare("SELECT document, revision FROM match_canvas WHERE match_id = ? AND team = ?").get(matchId, participant.team) as { document: string; revision: number } | undefined;
  const initialCanvas = canvasRow ? JSON.parse(canvasRow.document) as SharedCanvas : emptyCanvas();
  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play" playerHandle={handle}/><div className="match-live-shell"><MatchExperience match={{ id: matchId, userId: session.user.id, mode: match.mode, handle, opponents, isNpc: Boolean(match.is_npc), scenario: brief.name, rankTone: rankTone(ratingRow?.rating), initialCanvas, initialRevision: canvasRow?.revision ?? 0 , buildEndsAt: clock?.buildEndsAt ?? null, serverNow: serverTime() }} brief={brief} initialState={{ ownReady, ready, total, allReady: total > 0 && ready >= total }}/></div></div></main>;
}
