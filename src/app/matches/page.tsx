import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Mode } from "@/lib/game-types";

type CompletedMatch = { id: string; mode: Mode; challenge: string; createdAt: number };

export default async function MatchesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const matches = db.prepare("SELECT m.id, m.mode, m.challenge, m.created_at AS createdAt FROM game_match m JOIN match_player p ON p.match_id = m.id WHERE p.user_id = ? AND m.status = 'completed' ORDER BY m.created_at DESC LIMIT 50").all(session.user.id) as CompletedMatch[];
  return <main className="game-shell"><GameRail active="matches"/><div className="game-main"><GameTopbar active="matches"/><div className="subpage"><div className="page-head"><div><span className="page-kicker"><History size={16}/> PLAYER ARCHIVE</span><h1>Previous matches</h1></div><div className="head-index"><span>COMPLETED</span><strong>{matches.length}</strong><small>MATCHES</small></div></div><section className="match-list history-list" aria-label="Previous matches"><div className="board-label"><span>MATCH HISTORY</span><span>{matches.length} RECORDS</span></div>{matches.length ? matches.map(match => <div className="match-row" key={match.id}><span className="match-result">{match.mode}</span><span className="match-main"><strong>{match.challenge === "ticket-onsale" ? "Ticket onsale" : match.challenge}</strong><small>MATCH {match.id.slice(0, 8).toUpperCase()}</small></span><span className="match-meta"><small>{new Date(match.createdAt).toLocaleDateString()}</small></span></div>) : <div className="history-empty"><History size={32}/><strong>NO COMPLETED MATCHES</strong><span>Your finished matches will appear here.</span><Link href="/play">GO TO PLAY <ArrowRight size={16}/></Link></div>}</section></div></div></main>;
}
