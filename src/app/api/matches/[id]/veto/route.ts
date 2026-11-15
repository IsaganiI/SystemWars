import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureVeto, vetoState } from "@/lib/veto";
import { vetoScenarios, type VetoScenario } from "@/lib/veto-scenarios";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

async function access(request: Request, matchId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: "Sign in required", status: 401 } as const;
  const match = db.prepare("SELECT status FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { status: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || !player) return { error: "Match not found", status: 404 } as const;
  if (match.status !== "ready") return { error: "Match is not ready for veto", status: 409 } as const;
  return { team: player.team } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await access(request, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(vetoState(id, result.team));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const { id } = await params;
  const result = await access(request, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ error: "Invalid veto request" }, { status: 400 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid veto request" }, { status: 400 }); }
  const scenario = typeof body === "object" && body !== null && "scenario" in body ? body.scenario : undefined;
  if (typeof scenario !== "string" || !vetoScenarios.some(item => item.id === scenario)) return NextResponse.json({ error: "Choose a valid scenario" }, { status: 400 });

  const outcome = db.transaction(() => {
    const match = db.prepare("SELECT status, is_npc FROM game_match WHERE id = ?").get(id) as { status: string; is_npc: number } | undefined;
    if (match?.status !== "ready") return "Match is no longer ready";
    const veto = ensureVeto(id);
    if (veto.selected_scenario) return "Veto is already complete";
    if (veto.turn_team !== result.team) return "Wait for the other team";
    if (veto.first_ban === scenario) return "That scenario was already banned";
    if (!veto.first_ban) {
      db.prepare("UPDATE match_veto SET first_ban = ?, turn_team = ? WHERE match_id = ? AND first_ban IS NULL AND turn_team = ?")
        .run(scenario, 1 - result.team, id, result.team);
      if (match.is_npc) {
        const remaining = vetoScenarios.map(item => item.id).filter(item => item !== scenario);
        const rivalBan = remaining[0];
        const selected = remaining[1];
        db.prepare("UPDATE match_veto SET second_ban = ?, selected_scenario = ?, turn_team = 2, completed_at = ? WHERE match_id = ?")
          .run(rivalBan, selected, Date.now(), id);
        db.prepare("UPDATE game_match SET challenge = ? WHERE id = ?").run(selected, id);
      }
    } else {
      const selected = vetoScenarios.map(item => item.id).find(item => item !== veto.first_ban && item !== scenario) as VetoScenario;
      db.prepare("UPDATE match_veto SET second_ban = ?, selected_scenario = ?, turn_team = 2, completed_at = ? WHERE match_id = ? AND second_ban IS NULL AND turn_team = ?")
        .run(scenario, selected, Date.now(), id, result.team);
      db.prepare("UPDATE game_match SET challenge = ? WHERE id = ?").run(selected, id);
    }
    return null;
  })();
  if (outcome) return NextResponse.json({ error: outcome }, { status: 409 });
  return NextResponse.json(vetoState(id, result.team));
}
