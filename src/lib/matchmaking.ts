import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import { PACE } from "@/lib/match-pace";

/** Extra time on top of the visible ready-check countdown before the server gives up, to absorb polling delay. */
const READY_CHECK_GRACE_MS = 3000;

/** Pairs waiting players of similar rating. The rating window widens the longer someone waits. Call inside a transaction. */
export function pairWaiting(mode: Mode, now: number) {
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

export function readyCheckEndsAt(createdAt: number) {
  return createdAt + PACE.readyCheckSeconds * 1000;
}

/**
 * Cancels a match that is still in its ready check. Players who already accepted go back into the queue with
 * their original queue time, so they keep their place; everyone else sees the cancelled state. Returns false
 * if the match already left the ready check. Safe to call inside another transaction (it becomes a savepoint).
 */
export function cancelReadyCheck(matchId: string, now = Date.now()) {
  return db.transaction(() => {
    const match = db.prepare("SELECT mode FROM game_match WHERE id = ? AND status = 'found'").get(matchId) as { mode: Mode } | undefined;
    if (!match) return false;
    db.prepare("UPDATE game_match SET status = 'cancelled' WHERE id = ?").run(matchId);
    db.prepare("UPDATE queue_ticket SET status = 'waiting', match_id = NULL, seen_at = ? WHERE match_id = ? AND status = 'accepted'").run(now, matchId);
    db.prepare("UPDATE queue_ticket SET status = 'cancelled' WHERE match_id = ? AND status = 'found'").run(matchId);
    pairWaiting(match.mode, now);
    return true;
  })();
}

/** Cancels every ready check whose countdown (plus a short grace period) has run out. */
export function expireReadyChecks(now = Date.now()) {
  const stale = db.prepare("SELECT id FROM game_match WHERE status = 'found' AND created_at < ?")
    .all(now - PACE.readyCheckSeconds * 1000 - READY_CHECK_GRACE_MS) as { id: string }[];
  for (const match of stale) cancelReadyCheck(match.id, now);
}
