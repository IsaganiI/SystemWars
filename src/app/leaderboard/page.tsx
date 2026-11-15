"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Trophy } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { RankEmblem } from "@/components/rank-emblem";
import type { Mode } from "@/lib/game-types";
import { rankName, rankTone } from "@/lib/rank-tone";

type Player = { id: string; handle: string; rating: number; wins: number; losses: number; draws: number; isDemo?: boolean };
const modes: Mode[] = ["1v1", "2v2", "3v3"];
const exhibitionRoster = [
  ["FramePerfect", 2180, 42, 7, 1],
  ["KernelKnight", 1965, 38, 12, 0],
  ["CacheQueen", 1782, 33, 16, 2],
  ["NullPointer", 1644, 29, 17, 1],
  ["StackSmash", 1518, 25, 19, 0],
  ["PacketPirate", 1376, 21, 20, 2],
  ["ByteBrawler", 1262, 18, 23, 1],
  ["LatencyLynx", 1146, 15, 24, 1],
  ["PingPanda", 1058, 11, 27, 2],
  ["RootAccess", 972, 9, 29, 1],
  ["BugBounty", 884, 6, 33, 0],
  ["SyntaxSamurai", 792, 4, 37, 1],
] as const;

function makeExhibitionPlayers(mode: Mode): Player[] {
  return exhibitionRoster.map(([handle, rating, wins, losses, draws], index) => ({
    id: `exhibition-${mode}-${index + 1}`,
    handle,
    rating,
    wins,
    losses,
    draws,
    isDemo: true,
  }));
}

function LeaderboardEntry({ player, position }: { player: Player; position: number }) {
  const games = player.wins + player.losses + player.draws;
  const rowClass = `ranking-entry ranking-entry-${rankTone(player.rating)}${player.isDemo ? " ranking-entry-demo" : ""}`;
  const row = <><span className="ranking-entry-position">{String(position).padStart(2, "0")}</span><span className="ranking-entry-player"><RankEmblem rating={player.rating} size={42} className="ranking-entry-avatar"/><span><strong>{player.handle}</strong><small>{rankName(player.rating).toUpperCase()}{player.isDemo && <i>EXHIBITION</i>}</small></span></span><span className="ranking-entry-record">{player.wins}W <i/> {player.losses}L <i/> {player.draws}D<small>{games ? `${Math.round((player.wins + player.draws * .5) / games * 100)}% WIN RATE` : "NO GAMES"}</small></span><span className="ranking-entry-rating">{player.rating.toLocaleString()}<small>SR</small>{!player.isDemo && <ArrowRight size={20}/>}</span></>;
  return player.isDemo ? <div className={rowClass}>{row}</div> : <Link href={`/players/${encodeURIComponent(player.id)}`} className={rowClass}>{row}</Link>;
}

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [showingExhibition, setShowingExhibition] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboard?mode=${mode}`, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load standings.");
      return response.json();
    }).then(body => { if (active) { setShowingExhibition(body.players.length === 0); setPlayers(body.players.length ? body.players : makeExhibitionPlayers(mode)); setError(""); } })
      .catch(() => { if (active) setError("Could not load standings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  const visible = players.filter(player => player.handle.toLowerCase().includes(query.trim().toLowerCase()));
  const exhibitionVisible = makeExhibitionPlayers(mode).filter(player => player.handle.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="game-shell"><GameRail active="leaderboard"/><div className="game-main"><GameTopbar active="leaderboard"/><div className="subpage arena-page leaderboard-page competitive-page">
    <header className="arena-feature-head"><div className="arena-feature-copy"><h1>LEADER<span>BOARD</span></h1></div></header>
    <div className="arena-command-bar"><div className="mode-filter" role="group" aria-label="Match type">{modes.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => { setLoading(true); setMode(item); }}>{item}</button>)}</div><label className="board-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="SEARCH PLAYERS" aria-label="Find a player"/></label></div>
    <section className={`ranking-stage ${showingExhibition ? "ranking-stage-exhibition" : ""}`} aria-label="Leaderboard">
      {showingExhibition && !loading && !error && <header className="ranking-exhibition-banner"><span><Trophy size={20}/> EXHIBITION ROSTER</span><strong>SAMPLE PLAYERS</strong></header>}
      <div className="ranking-stage-columns"><span>RANK</span><span>PLAYER</span><span>RECORD</span><span>RATING</span></div>
      {loading ? <div className="arena-empty"><strong>LOADING STANDINGS</strong></div> : error ? <div className="arena-empty" role="alert"><strong>STANDINGS UNAVAILABLE</strong><p>{error}</p></div> : visible.length ? <div className="ranking-stage-rows">{visible.map(player => <LeaderboardEntry key={player.id} player={player} position={players.indexOf(player) + 1}/>)}</div> : <div className="arena-empty"><Trophy size={57} strokeWidth={1.4}/><strong>{query ? "NO PLAYER FOUND" : "THE BOARD IS OPEN"}</strong><p>{query ? "Try a different handle." : "The first completed ranked match will put a player on the board."}</p><Link href="/play">{query ? "BACK TO PLAY" : "ENTER THE ARENA"} <ArrowRight size={19}/></Link></div>}
    </section>
    {!loading && !error && !showingExhibition && players.length > 0 && exhibitionVisible.length > 0 && <section className="ranking-stage ranking-stage-exhibition" aria-label="Exhibition sample players"><header className="ranking-exhibition-banner"><span><Trophy size={20}/> EXHIBITION ROSTER</span><strong>SAMPLE PLAYERS</strong></header><div className="ranking-stage-columns"><span>RANK</span><span>PLAYER</span><span>RECORD</span><span>RATING</span></div><div className="ranking-stage-rows">{exhibitionVisible.map(player => <LeaderboardEntry key={player.id} player={player} position={exhibitionRoster.findIndex(item => item[0] === player.handle) + 1}/>)}</div></section>}
  </div></div></main>;
}
