"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Trophy } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import type { Mode } from "@/lib/game-types";

type Player = { handle: string; rating: number; wins: number; losses: number };
const modes: Mode[] = ["1v1", "2v2", "3v3"];

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboard?mode=${mode}`).then(async response => {
      if (!response.ok) throw new Error("Could not load standings.");
      return response.json();
    }).then(body => { if (active) { setPlayers(body.players); setError(""); } }).catch(() => { if (active) setError("Could not load standings."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);
  const visible = players.filter(player => player.handle.toLowerCase().includes(query.trim().toLowerCase()));

  return <main className="game-shell"><GameRail active="leaderboard"/><div className="game-main"><GameTopbar active="leaderboard"/><div className="subpage"><div className="page-head"><div><span className="page-kicker"><Trophy size={16}/> GLOBAL STANDINGS</span><h1>Leaderboard</h1></div><div className="head-index"><span>RANKED PLAYERS</span><strong>{players.length}</strong><small>{mode} FORMAT</small></div></div><div className="board-controls"><div className="mode-filter" role="group" aria-label="Leaderboard format">{modes.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => { setLoading(true); setMode(item); }}>{item}</button>)}</div><label className="board-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a player" aria-label="Find a player"/></label></div><section className="leaderboard-board" aria-label={`${mode} global leaderboard`}><div className="board-label"><span>GLOBAL RANKING</span><span>RANKED {mode}</span></div><div className="leaderboard-columns leaderboard-columns-live"><span>POS</span><span>PLAYER</span><span>RECORD</span><span>WIN RATE</span><span>RATING</span></div><div className="leaderboard-rows" key={mode}>{loading ? <div className="board-empty">Loading standings…</div> : error ? <div className="board-empty">{error}</div> : visible.length ? visible.map(player => <div className="leaderboard-row leaderboard-row-live" key={player.handle}><span className="leaderboard-position">{String(players.indexOf(player) + 1).padStart(2, "0")}</span><span className="leaderboard-player"><strong>{player.handle}</strong></span><span className="leaderboard-record">{player.wins}W – {player.losses}L</span><span className="leaderboard-winrate">{Math.round(player.wins / (player.wins + player.losses) * 100)}%</span><strong className="leaderboard-rating">{player.rating.toLocaleString()} <small>SR</small></strong></div>) : <div className="ranking-empty"><Trophy size={32}/><strong>{query ? "NO PLAYERS FOUND" : "NO RANKED STANDINGS YET"}</strong><span>{query ? "Try another handle." : "Standings will appear after completed ranked matches."}</span><Link href="/play">GO TO PLAY <ArrowRight size={16}/></Link></div>}</div></section></div></div></main>;
}
