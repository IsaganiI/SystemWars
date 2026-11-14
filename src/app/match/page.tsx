import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MatchPreview } from "@/components/match-preview";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const matchId = (await searchParams).id;
  if (!matchId) redirect("/play");
  const match = db.prepare("SELECT mode, status FROM game_match WHERE id = ?").get(matchId) as { mode: Mode; status: string } | undefined;
  const participant = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || match.status !== "ready" || !participant) redirect("/play");
  const submitted = db.prepare("SELECT 1 FROM match_design WHERE match_id = ? AND team = ?").get(matchId, participant.team);
  if (submitted) redirect(`/results?id=${encodeURIComponent(matchId)}`);
  return <MatchPreview mode={match.mode} matchId={matchId}/>;
}
