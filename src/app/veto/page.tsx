import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VetoScreen } from "@/components/veto-screen";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vetoState } from "@/lib/veto";

export default async function VetoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const id = (await searchParams).id;
  if (!id) redirect("/play");
  const match = db.prepare("SELECT status, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(id) as { status: string; is_npc: number } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(id, session.user.id) as { team: number } | undefined;
  if (!match || match.status !== "ready" || !player) redirect("/play");
  const state = vetoState(id, player.team);
  if (state.selectedScenario) redirect(`/match?id=${encodeURIComponent(id)}`);
  const handle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  const opponents = db.prepare(`SELECT COALESCE(u."displayUsername", u.username, u.name) AS handle
    FROM match_player mp JOIN user u ON u.id = mp.user_id WHERE mp.match_id = ? AND mp.team != ? ORDER BY mp.accepted_at, mp.user_id`)
    .all(id, player.team) as { handle: string }[];
  const rival = match.is_npc ? "SYSTEM AI" : opponents.map(opponent => opponent.handle).join(" + ") || "RIVAL TEAM";
  return <VetoScreen matchId={id} handle={handle} rival={rival} initialState={state}/>;
}
