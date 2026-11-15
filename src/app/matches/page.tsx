import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";
import { vetoScenarios } from "@/lib/veto-scenarios";

type CompletedMatch = { id: string; mode: Mode; challenge: string; createdAt: number; yourScore: number; rivalScore: number; ratingDelta: number; result: string; isNpc: number };

export default async function MatchesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const matches = db.prepare(`SELECT m.id, m.mode, m.challenge, m.created_at AS createdAt,
    mine.score AS yourScore, theirs.score AS rivalScore, COALESCE(change.delta, 0) AS ratingDelta,
    COALESCE(change.result, CASE WHEN mine.score > theirs.score THEN 'win' WHEN mine.score < theirs.score THEN 'loss' ELSE 'draw' END) AS result,
    m.is_npc AS isNpc
    FROM game_match m JOIN match_player p ON p.match_id = m.id
    JOIN match_result mine ON mine.match_id = m.id AND mine.team = p.team
    JOIN match_result theirs ON theirs.match_id = m.id AND theirs.team != p.team
    LEFT JOIN rating_change change ON change.match_id = m.id AND change.user_id = p.user_id
    WHERE p.user_id = ? AND m.status = 'completed' ORDER BY m.created_at DESC LIMIT 50`).all(session.user.id) as CompletedMatch[];

  return <main className="game-shell"><GameRail active="matches"/><div className="game-main"><GameTopbar active="matches"/><div className="subpage arena-page matches-page competitive-page">
    <header className="arena-feature-head"><div className="arena-feature-copy"><h1>MATCH <span>ARCHIVE</span></h1></div></header>
    <section className="history-stage" aria-label="Previous matches">{matches.length ? <div className="history-card-grid">{matches.map(match => <Link href={`/results?id=${encodeURIComponent(match.id)}`} className={`history-card history-card-${match.result}`} key={match.id}><div className="history-card-top"><span>{match.isNpc ? "AI CHALLENGE" : `RANKED ${match.mode.toUpperCase()}`}</span><time dateTime={new Date(match.createdAt).toISOString()}>{new Date(match.createdAt).toLocaleDateString()}</time></div><div className="history-card-title"><strong>{vetoScenarios.find(item => item.id === match.challenge)?.name ?? match.challenge}</strong><span>{match.result.toUpperCase()}</span></div><div className="history-card-score"><div><small>YOUR SYSTEM</small><b>{match.yourScore}</b></div><span>VS</span><div><small>{match.isNpc ? "SYSTEM AI" : "RIVAL SYSTEM"}</small><b>{match.rivalScore}</b></div></div><div className="history-card-foot"><span>{match.isNpc ? "PRACTICE · NO SR" : `${match.ratingDelta >= 0 ? "+" : ""}${match.ratingDelta} SR`}</span><strong>VIEW RESULT <ArrowRight size={19}/></strong></div></Link>)}</div> : <div className="arena-empty history-arena-empty"><History size={58} strokeWidth={1.4}/><strong>YOUR STORY STARTS HERE</strong><p>Finished matches will fill this archive.</p><Link href="/play">FIND A MATCH <ArrowRight size={19}/></Link></div>}</section>
  </div></div></main>;
}
