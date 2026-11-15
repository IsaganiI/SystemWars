"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Shield, Trophy } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import type { Mode } from "@/lib/game-types";
import { rankName, rankTone } from "@/lib/rank-tone";

type Player = { id: string; handle: string; rating: number; wins: number; losses: number; draws: number };
const modes: Mode[] = ["1v1", "2v2", "3v3"];

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboard?mode=${mode}`, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load standings.");
      return response.json();
    }).then(body => { if (active) { setPlayers(body.players); setError(""); } })
      .catch(() => { if (active) setError("Could not load standings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  const visible = players.filter(player => player.handle.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="game-shell"><GameRail active="leaderboard"/><div className="game-main"><GameTopbar active="leaderboard"/><div className="subpage arena-page leaderboard-page competitive-page">
    <header className="arena-feature-head"><div className="arena-feature-copy"><h1>LEADER<span>BOARD</span></h1></div></header>
    <div className="arena-command-bar"><div className="mode-filter" role="group" aria-label="Match type">{modes.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => { setLoading(true); setMode(item); }}>{item}</button>)}</div><label className="board-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="SEARCH PLAYERS" aria-label="Find a player"/></label></div>
    <section className="ranking-stage" aria-label="Leaderboard"><div className="ranking-stage-columns"><span>RANK</span><span>PLAYER</span><span>RECORD</span><span>RATING</span></div>
      {loading ? <div className="arena-empty"><strong>LOADING STANDINGS</strong></div> : error ? <div className="arena-empty" role="alert"><strong>STANDINGS UNAVAILABLE</strong><p>{error}</p></div> : visible.length ? <div className="ranking-stage-rows">{visible.map(player => { const games = player.wins + player.losses + player.draws; return <Link href={`/players/${encodeURIComponent(player.id)}`} className={`ranking-entry ranking-entry-${rankTone(player.rating)}`} key={player.id}><span className="ranking-entry-position">{String(players.indexOf(player) + 1).padStart(2, "0")}</span><span className="ranking-entry-player"><span className="ranking-entry-avatar"><Shield size={23}/></span><span><strong>{player.handle}</strong><small>{rankName(player.rating).toUpperCase()}</small></span></span><span className="ranking-entry-record">{player.wins}W <i/> {player.losses}L <i/> {player.draws}D<small>{games ? `${Math.round((player.wins + player.draws * .5) / games * 100)}% WIN RATE` : "NO GAMES"}</small></span><span className="ranking-entry-rating">{player.rating.toLocaleString()}<small>SR</small><ArrowRight size={20}/></span></Link>; })}</div> : <div className="arena-empty"><Trophy size={57} strokeWidth={1.4}/><strong>{query ? "NO PLAYER FOUND" : "THE BOARD IS OPEN"}</strong><p>{query ? "Try a different handle." : "The first completed ranked match will put a player on the board."}</p><Link href="/play">{query ? "BACK TO PLAY" : "ENTER THE ARENA"} <ArrowRight size={19}/></Link></div>}
    </section>
  </div></div></main>;
}
