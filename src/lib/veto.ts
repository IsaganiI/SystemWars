import { db } from "@/lib/db";
import { difficultyForRating, scenariosForMatch, vetoScenarios, type VetoScenario } from "@/lib/veto-scenarios";
export type VetoRow = {
  match_id: string;
  first_team: number;
  turn_team: number;
  first_ban: VetoScenario | null;
  second_ban: VetoScenario | null;
  selected_scenario: VetoScenario | null;
  scenario_pool: string | null;
};

export function ensureVeto(matchId: string) {
  const match = db.prepare("SELECT id, mode, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { id: string; mode: string; is_npc: number } | undefined;
  if (!match) throw new Error("Match not found");
  const rank = db.prepare(`SELECT AVG(COALESCE(r.rating, 1000)) AS rating FROM match_player p
    LEFT JOIN player_rating r ON r.user_id = p.user_id AND r.mode = ? WHERE p.match_id = ?`).get(match.mode, matchId) as { rating: number | null };
  const difficulty = difficultyForRating(rank.rating ?? 1000);
  const firstTeam = match.is_npc ? 0 : Number.parseInt(matchId.slice(-1), 16) % 2;
  db.prepare("INSERT OR IGNORE INTO match_veto (match_id, first_team, turn_team) VALUES (?, ?, ?)").run(matchId, firstTeam, firstTeam);
  const valid = new Set(vetoScenarios.map(item => item.id));
  const previous = db.prepare("SELECT first_ban, second_ban, selected_scenario, scenario_pool AS scenario_pool FROM match_veto WHERE match_id = ?").get(matchId) as Pick<VetoRow, "first_ban" | "second_ban" | "selected_scenario" | "scenario_pool">;
  const resetInvalidScenario = [previous.first_ban, previous.second_ban, previous.selected_scenario].some(value => value && !valid.has(value));
  if (resetInvalidScenario) {
    db.prepare("UPDATE match_veto SET first_ban = NULL, second_ban = NULL, selected_scenario = NULL, scenario_pool = NULL, first_team = ?, turn_team = ?, completed_at = NULL WHERE match_id = ?")
      .run(firstTeam, firstTeam, matchId);
  }
  const bans = resetInvalidScenario ? [] : [previous.first_ban, previous.second_ban, previous.selected_scenario].filter((value): value is VetoScenario => Boolean(value && valid.has(value)));
  const existingPool = previous.scenario_pool ? safeScenarioPool(previous.scenario_pool, valid) : null;
  const poolMatchesDifficulty = existingPool?.every(id => vetoScenarios.find(scenario => scenario.id === id)?.difficulty === difficulty) ?? false;
  // Keep an in-progress veto stable after a ban; redraw untouched older pools under the current rank rules.
  const keepExistingPool = Boolean(existingPool && bans.every(item => existingPool.includes(item)) && (bans.length > 0 || poolMatchesDifficulty));
  const scenarioPool = keepExistingPool ? existingPool! : scenariosForMatch(matchId, bans, difficulty);
  db.prepare("UPDATE match_veto SET scenario_pool = ? WHERE match_id = ? AND scenario_pool IS NULL").run(JSON.stringify(scenarioPool), matchId);
  const row = db.prepare("SELECT * FROM match_veto WHERE match_id = ?").get(matchId) as VetoRow;
  const storedPool = safeScenarioPool(row.scenario_pool ?? "", valid);
  if (!storedPool || JSON.stringify(storedPool) !== row.scenario_pool) {
    db.prepare("UPDATE match_veto SET scenario_pool = ? WHERE match_id = ?").run(JSON.stringify(scenarioPool), matchId);
    row.scenario_pool = JSON.stringify(scenarioPool);
  }
  return row;
}

function safeScenarioPool(value: string, valid: Set<string>): VetoScenario[] | null {
  try {
    const pool: unknown = JSON.parse(value);
    if (!Array.isArray(pool) || pool.length !== 3) return null;
    const normalized = pool.map(item => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null && "id" in item && typeof item.id === "string") return item.id;
      return null;
    });
    if (normalized.some(item => item === null || !valid.has(item)) || new Set(normalized).size !== 3) return null;
    return normalized as VetoScenario[];
  } catch { return null; }
}

export function vetoState(matchId: string, team: number) {
  const veto = ensureVeto(matchId);
  const match = db.prepare("SELECT is_npc FROM game_match WHERE id = ?").get(matchId) as { is_npc: number };
  const pool = safeScenarioPool(veto.scenario_pool ?? "", new Set(vetoScenarios.map(item => item.id))) ?? [];
  return {
    isNpc: Boolean(match.is_npc),
    turnTeam: veto.turn_team,
    firstTeam: veto.first_team,
    yourTeam: team,
    firstBan: veto.first_ban,
    secondBan: veto.second_ban,
    selectedScenario: veto.selected_scenario,
    scenarios: pool.flatMap(id => {
      const scenario = vetoScenarios.find(item => item.id === id);
      return scenario ? [scenario] : [];
    }),
  };
}
