import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, Swords } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { ResultsAutoRefresh } from "@/components/results-auto-refresh";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import type { ScoreBreakdown } from "@/lib/scoring";
import { vetoScenarios } from "@/lib/veto-scenarios";
import { enforceBuildDeadline } from "@/lib/build-clock";

type Design = { team: number };
type Result = { team: number; score: number; breakdown: string };
type RatingChange = { delta: number; result: "win" | "loss" | "draw" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const matchId = (await searchParams).id;
  if (!matchId) redirect("/play");
  // If the other team never submitted, lock them in once the build time is over so this page can show a result.
  enforceBuildDeadline(matchId);
  const match = db.prepare("SELECT mode, status, challenge, is_npc FROM game_match WHERE id = ? AND is_test = 0").get(matchId) as { mode: Mode; status: string; challenge: string; is_npc: number } | undefined;
  const player = db.prepare("SELECT team FROM match_player WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as { team: number } | undefined;
  if (!match || !player || match.status === "cancelled") redirect("/play");
  const designs = db.prepare("SELECT team FROM match_design WHERE match_id = ?").all(matchId) as Design[];
  const ownDesign = designs.find(design => design.team === player.team);
  if (!ownDesign) redirect(`/match?id=${encodeURIComponent(matchId)}`);
  const rivalDesign = designs.find(design => design.team !== player.team);
  const results = db.prepare("SELECT team, score, breakdown FROM match_result WHERE match_id = ?").all(matchId) as Result[];
  const ownResult = results.find(result => result.team === player.team);
  const rivalResult = results.find(result => result.team !== player.team);
  const change = db.prepare("SELECT delta, result FROM rating_change WHERE match_id = ? AND user_id = ?").get(matchId, session.user.id) as RatingChange | undefined;
  const challengeName = vetoScenarios.find(item => item.id === match.challenge)?.name ?? match.challenge;
  const finished = Boolean(match.status === "completed" && ownResult && rivalResult);
  const outcome = ownResult && rivalResult ? ownResult.score > rivalResult.score ? "Victory" : ownResult.score < rivalResult.score ? "Defeat" : "Draw" : "Pending";
  const breakdown = ownResult ? JSON.parse(ownResult.breakdown) as ScoreBreakdown : [];
  const legacyScore = breakdown.some(item => item.label === "Connected architecture");
  const handle = session.user.displayUsername ?? session.user.username ?? session.user.name;

  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play"/><div className={`subpage arena-page result-page result-${outcome.toLowerCase()}`}>
    {!finished && <ResultsAutoRefresh/>}
    <div className="result-topline"><Link href="/play" className="match-back"><ArrowLeft size={17}/> PLAY</Link><span><Swords size={18}/> {match.is_npc ? "AI CHALLENGE" : "RANKED MATCH"} <i/> {match.mode.toUpperCase()}</span></div>
    <section className="result-hero" aria-label="Match outcome"><div className="result-hero-flare" aria-hidden="true"/><span className="result-stage">{challengeName.toUpperCase()}</span><h1>{finished ? outcome : "DESIGN"}<span>{finished ? "!" : " LOCKED"}</span></h1><p>{finished ? outcome === "Draw" ? "AN EVENLY MATCHED BATTLE" : outcome === "Victory" ? "YOUR SYSTEM WON THE BATTLE" : "THE OTHER SYSTEM TOOK THIS ROUND" : "WAITING FOR THE OTHER SIDE"}</p></section>
    <section className="result-board" aria-label="Match scores"><div className="result-side result-side-player"><strong className="result-fighter-name">{handle}</strong><div className="result-score">{ownResult ? ownResult.score : "—"}<small>{ownResult ? "/ 100" : "SUBMITTED"}</small></div></div><span className="result-vs" aria-label="versus">{finished ? <><b>V</b><i/><b>S</b></> : <Clock3 size={35}/>}</span><div className="result-side result-side-rival"><strong className="result-fighter-name">{match.is_npc ? "SYSTEM AI" : "RIVAL"}</strong><div className="result-score">{rivalResult ? rivalResult.score : "—"}<small>{rivalResult ? "/ 100" : rivalDesign ? "SUBMITTED" : "PENDING"}</small></div></div></section>
    {finished && legacyScore ? <div className="result-legacy-score"><strong>FINAL SCORE RECORDED</strong><span>This match used the original scoring rules. Its result and SR remain unchanged.</span></div> : finished ? <section className="result-scorecard" aria-label="Your scorecard"><header><div><span>SYSTEM EVALUATION</span><h2>YOUR SCORECARD</h2></div><strong>{change ? `${change.delta >= 0 ? "+" : ""}${change.delta} SR` : "NO SR CHANGE"}</strong></header><div className="result-scorecard-rows">{breakdown.map(item => <div className="result-criterion" key={item.label}><span>{item.label}</span><div className="result-criterion-track" role="meter" aria-label={item.label} aria-valuenow={item.earned} aria-valuemin={0} aria-valuemax={item.possible}><i style={{ width: `${item.possible ? item.earned / item.possible * 100 : 0}%` }}/></div><b>{item.earned}<small> / {item.possible}</small></b></div>)}</div></section> : <div className="result-waiting" role="status"><Clock3 size={27}/><strong>YOUR DESIGN IS IN</strong><span>Scores appear when both sides finish.</span></div>}
    <div className="result-actions"><span>{match.is_npc ? "PRACTICE MATCH" : "RANKED MATCH"} · {matchId.slice(0, 8).toUpperCase()}</span><Link href="/play" className="result-play-again">PLAY AGAIN <ArrowRight size={21}/></Link></div>
  </div></div></main>;
}
