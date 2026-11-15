import { db } from "@/lib/db";
import { vetoScenarios, type VetoScenario } from "@/lib/veto-scenarios";
export type VetoRow = {
  match_id: string;
  first_team: number;
  turn_team: number;
  first_ban: VetoScenario | null;
  second_ban: VetoScenario | null;
  selected_scenario: VetoScenario | null;
};

export function ensureVeto(matchId: string) {
  const match = db.prepare("SELECT id, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { id: string; is_npc: number } | undefined;
  if (!match) throw new Error("Match not found");
  const firstTeam = match.is_npc ? 0 : Number.parseInt(matchId.slice(-1), 16) % 2;
  db.prepare("INSERT OR IGNORE INTO match_veto (match_id, first_team, turn_team) VALUES (?, ?, ?)").run(matchId, firstTeam, firstTeam);
  const valid = new Set(vetoScenarios.map(item => item.id));
  const previous = db.prepare("SELECT first_ban, second_ban, selected_scenario FROM match_veto WHERE match_id = ?").get(matchId) as Pick<VetoRow, "first_ban" | "second_ban" | "selected_scenario">;
  if ([previous.first_ban, previous.second_ban, previous.selected_scenario].some(value => value && !valid.has(value))) {
    db.prepare("UPDATE match_veto SET first_ban = NULL, second_ban = NULL, selected_scenario = NULL, first_team = ?, turn_team = ?, completed_at = NULL WHERE match_id = ?")
      .run(firstTeam, firstTeam, matchId);
  }
  return db.prepare("SELECT * FROM match_veto WHERE match_id = ?").get(matchId) as VetoRow;
}

export function vetoState(matchId: string, team: number) {
  const veto = ensureVeto(matchId);
  const match = db.prepare("SELECT is_npc FROM game_match WHERE id = ?").get(matchId) as { is_npc: number };
  return {
    isNpc: Boolean(match.is_npc),
    turnTeam: veto.turn_team,
    firstTeam: veto.first_team,
    yourTeam: team,
    firstBan: veto.first_ban,
    secondBan: veto.second_ban,
    selectedScenario: veto.selected_scenario,
    scenarios: vetoScenarios,
  };
}
