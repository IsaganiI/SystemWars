import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, Clock3 } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";

type Design = { team: number; components: string; submitted_at: number };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const matchId = (await searchParams).id;
  if (!matchId) redirect("/play");
  const match = db.prepare("SELECT mode, status FROM game_match WHERE id = ?").get(matchId) as { mode: Mode; status: string } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || !player || match.status === "cancelled") redirect("/play");
  const designs = db.prepare("SELECT team, components, submitted_at FROM match_design WHERE match_id = ?").all(matchId) as Design[];
  const ownDesign = designs.find(design => design.team === player.team);
  const rivalDesign = designs.find(design => design.team !== player.team);
  if (!ownDesign) redirect(`/match?id=${encodeURIComponent(matchId)}`);
  const componentCount = 4 + (JSON.parse(ownDesign.components) as string[]).length;

  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play"/><div className="subpage result-page"><Link href="/play" className="match-back"><ArrowLeft size={16}/> BACK TO PLAY</Link><div className="result-hero"><span className="page-kicker"><CircleCheck size={16}/> RANKED {match.mode} / TICKET ONSALE</span><h1>Design<br/><span>submitted.</span></h1><p>YOUR TEAM&apos;S ARCHITECTURE IS LOCKED IN</p></div><div className="result-board"><div className="result-side result-side-player"><span className="result-side-label">YOUR TEAM</span><strong className="result-status">SUBMITTED</strong><small>{componentCount} COMPONENTS</small></div><span className="result-vs"><Clock3 size={24}/></span><div className="result-side"><span className="result-side-label">OTHER TEAM</span><strong className="result-status">{rivalDesign ? "SUBMITTED" : "PENDING"}</strong><small>{rivalDesign ? "DESIGN LOCKED" : "WAITING FOR SUBMISSION"}</small></div></div><div className="result-pending"><span>SIMULATION</span><strong>AWAITING ENGINE</strong><p>No performance metrics or winner are available yet. The deterministic simulator is the next backend milestone.</p></div><div className="result-actions"><span>MATCH ID · {matchId.slice(0, 8).toUpperCase()}</span><Link href="/play" className="result-play-again">BACK TO PLAY <ArrowRight size={18}/></Link></div></div></div></main>;
}
