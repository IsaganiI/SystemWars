import { db } from "@/lib/db";
import { scoreArchitecture, type Architecture } from "@/lib/scoring";
import { npcDesign } from "@/lib/npc-design";
import { vetoScenarios, type VetoScenario } from "@/lib/veto-scenarios";

type Match = { mode: string; challenge: string; status: string; is_npc: number };
type Design = { team: number; design: string | null };
type Player = { user_id: string; team: number; rating: number | null };

/** Run inside the design submission transaction. A completed match is never rated twice. */
export function completeMatch(matchId: string): boolean {
  const match = db.prepare("SELECT mode, challenge, status, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as Match | undefined;
  if (!match || match.status !== "ready" || !vetoScenarios.some(item => item.id === match.challenge)) return false;
  let designs = db.prepare("SELECT team, design FROM match_design WHERE match_id = ? ORDER BY team").all(matchId) as Design[];
  if (match.is_npc && designs.some(item => item.team === 0 && item.design) && !designs.some(item => item.team === 1)) {
    const system = npcDesign(match.challenge as VetoScenario);
    db.prepare("INSERT INTO match_design (match_id, team, components, design, submitted_by, submitted_at) VALUES (?, 1, '[]', ?, 'system-ai', ?)")
      .run(matchId, JSON.stringify(system), Date.now());
    designs = db.prepare("SELECT team, design FROM match_design WHERE match_id = ? ORDER BY team").all(matchId) as Design[];
  }
  if (designs.length !== 2 || designs[0].team !== 0 || designs[1].team !== 1 || designs.some(item => !item.design)) return false;

  const results = designs.map(item => {
    const design = JSON.parse(item.design!) as Architecture;
    return { team: item.team, ...scoreArchitecture(match.challenge as VetoScenario, design) };
  });
  const now = Date.now();
  const insertResult = db.prepare("INSERT INTO match_result (match_id, team, score, breakdown, created_at) VALUES (?, ?, ?, ?, ?)");
  for (const result of results) insertResult.run(matchId, result.team, result.score, JSON.stringify(result.breakdown), now);

  if (match.is_npc) {
    db.prepare("UPDATE game_match SET status = 'completed' WHERE id = ? AND status = 'ready'").run(matchId);
    db.prepare("DELETE FROM queue_ticket WHERE match_id = ?").run(matchId);
    return true;
  }

  const players = db.prepare(`SELECT p.user_id, p.team, r.rating FROM match_player p
    LEFT JOIN player_rating r ON r.user_id = p.user_id AND r.mode = ?
    WHERE p.match_id = ? ORDER BY p.team, p.user_id`).all(match.mode, matchId) as Player[];
  const teams = [0, 1].map(team => players.filter(player => player.team === team));
  if (teams.some(team => team.length !== Number(match.mode[0]))) throw new Error("Incomplete match roster");
  const averages = teams.map(team => team.reduce((sum, player) => sum + (player.rating ?? 1000), 0) / team.length);
  const teamZeroOutcome = results[0].score === results[1].score ? .5 : results[0].score > results[1].score ? 1 : 0;
  const expectedZero = 1 / (1 + 10 ** ((averages[1] - averages[0]) / 400));
  const deltas = [Math.round(32 * (teamZeroOutcome - expectedZero)), Math.round(32 * ((1 - teamZeroOutcome) - (1 - expectedZero)))];
  const updateRating = db.prepare(`INSERT INTO player_rating (user_id, mode, rating, wins, losses, draws)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, mode) DO UPDATE SET
    rating = excluded.rating, wins = player_rating.wins + excluded.wins,
    losses = player_rating.losses + excluded.losses, draws = player_rating.draws + excluded.draws`);
  const recordChange = db.prepare(`INSERT INTO rating_change
    (match_id, user_id, mode, before_rating, after_rating, delta, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const player of players) {
    const before = player.rating ?? 1000;
    const after = Math.max(0, before + deltas[player.team]);
    const outcome = teamZeroOutcome === .5 ? "draw" : (player.team === 0 ? teamZeroOutcome === 1 : teamZeroOutcome === 0) ? "win" : "loss";
    updateRating.run(player.user_id, match.mode, after, outcome === "win" ? 1 : 0, outcome === "loss" ? 1 : 0, outcome === "draw" ? 1 : 0);
    recordChange.run(matchId, player.user_id, match.mode, before, after, after - before, outcome, now);
  }
  db.prepare("UPDATE game_match SET status = 'completed' WHERE id = ? AND status = 'ready'").run(matchId);
  db.prepare("DELETE FROM queue_ticket WHERE match_id = ?").run(matchId);
  return true;
}
