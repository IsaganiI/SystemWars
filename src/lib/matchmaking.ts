import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import { isReadyCheckExpired, readyCheckEndsAt as matchReadyCheckEndsAt } from "@/lib/match-pace";
import { selectMatchGroups } from "@/lib/matchmaking-groups";

/** Pairs waiting players of similar rating. The rating window widens the longer someone waits. Call inside a transaction. */
export function pairWaiting(mode: Mode, now: number) {
  const teamSize = Number(mode[0]);
  const groups = db.prepare(`SELECT COALESCE(q.party_id, q.user_id) AS group_id, MIN(q.queued_at) AS queued_at,
      COUNT(*) AS size, AVG(COALESCE(r.rating, 1000)) AS rating
    FROM queue_ticket q LEFT JOIN player_rating r ON r.user_id = q.user_id AND r.mode = q.mode
    WHERE q.mode = ? AND q.status = 'waiting' GROUP BY COALESCE(q.party_id, q.user_id)
    HAVING COUNT(*) <= ? ORDER BY queued_at LIMIT 200`).all(mode, teamSize) as { group_id: string; queued_at: number; size: number; rating: number }[];
  const selected = selectMatchGroups(groups, teamSize, now);
  if (!selected) return;
  const groupIds = new Set(selected.groups.map(item => item.group_id));
  const playerRows = db.prepare(`SELECT q.user_id, q.party_id, q.queued_at, COALESCE(r.rating, 1000) AS rating
    FROM queue_ticket q LEFT JOIN player_rating r ON r.user_id = q.user_id AND r.mode = q.mode
    WHERE q.mode = ? AND q.status = 'waiting'`).all(mode) as { user_id: string; party_id: string | null; queued_at: number; rating: number }[];
  const selectedGroups = selected.groups.map(item => ({ ...item, players: playerRows.filter(player => groupIds.has(player.party_id ?? player.user_id) && (player.party_id ?? player.user_id) === item.group_id) }));
  const matchId = randomUUID();
  db.prepare("INSERT INTO game_match (id, mode, challenge, status, created_at) VALUES (?, ?, 'ticket-onsale', 'found', ?)").run(matchId, mode, now);
  const addPlayer = db.prepare("INSERT INTO match_player (match_id, user_id, team, accepted_at) VALUES (?, ?, ?, NULL)");
  const markFound = db.prepare("UPDATE queue_ticket SET status = 'found', match_id = ? WHERE user_id = ?");
  for (let partyIndex = 0; partyIndex < selectedGroups.length; partyIndex++) {
    const party = selectedGroups[partyIndex];
    const team = selected.assignment[partyIndex];
    for (const player of party.players) {
      addPlayer.run(matchId, player.user_id, team);
      markFound.run(matchId, player.user_id);
    }
  }
}

export function readyCheckEndsAt(createdAt: number) {
  return matchReadyCheckEndsAt(createdAt);
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
  const active = db.prepare("SELECT id, created_at AS createdAt FROM game_match WHERE status = 'found'")
    .all() as { id: string; createdAt: number }[];
  for (const match of active) if (isReadyCheckExpired(match.createdAt, now)) cancelReadyCheck(match.id, now);
}
