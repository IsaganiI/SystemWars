"use client";

import { useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { RankBadge } from "@/components/rank-badge";
import { leaderboardPlayers, rankForRating, type Mode } from "@/lib/demo-data";

const modes: Mode[] = ["1v1", "2v2", "3v3"];

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [query, setQuery] = useState("");
  const standings = useMemo(() => [...leaderboardPlayers].sort((a, b) => b.ratings[mode] - a.ratings[mode]), [mode]);
  const currentIndex = standings.findIndex(player => player.handle === "ARCHITECT_01");
  const current = standings[currentIndex];
  const visible = standings.filter(player => player.handle.toLowerCase().includes(query.trim().toLowerCase()));

  return <main className="game-shell"><GameRail active="leaderboard"/><div className="game-main"><GameTopbar active="leaderboard"/>
    <div className="subpage">
      <div className="page-head"><div><span className="page-kicker"><Trophy size={16}/> GLOBAL STANDINGS / SAMPLE DATA</span><h1>LEADERBOARD</h1></div><div className="head-index"><span>YOUR POSITION</span><strong>#{currentIndex + 1}</strong><small>{current.ratings[mode].toLocaleString()} SR · {mode}</small></div></div>

      <div className="board-controls"><div className="mode-filter" role="group" aria-label="Leaderboard format">{modes.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>{item}</button>)}</div><label className="board-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an architect" aria-label="Find an architect"/></label></div>

      <section className="leaderboard-board" aria-label={`${mode} global leaderboard`}>
        <div className="board-label"><span>GLOBAL RANKING</span><span>RANKED {mode} / SAMPLE STANDINGS</span></div>
        <div className="leaderboard-columns"><span>POS</span><span>ARCHITECT</span><span>TIER</span><span>RECORD</span><span>WIN RATE</span><span>RATING</span></div>
        <div className="leaderboard-rows" key={mode}>{visible.length ? visible.map(player => {
          const position = standings.indexOf(player) + 1;
          const rating = player.ratings[mode];
          const rank = rankForRating(rating);
          const winRate = Math.round(player.wins / (player.wins + player.losses) * 100);
          return <div key={player.handle} className={`leaderboard-row ${player.handle === "ARCHITECT_01" ? "leaderboard-row-you" : ""} ${position <= 3 ? "leaderboard-row-top" : ""}`}>
            <span className="leaderboard-position">{String(position).padStart(2, "0")}</span>
            <span className="leaderboard-player"><RankBadge rank={rank}/><span><strong>{player.handle}</strong><small>{player.handle === "ARCHITECT_01" ? "YOU" : `${player.streak} STREAK`}</small></span></span>
            <span className="leaderboard-tier"><strong>{rank}</strong><small>{rank === "Architect" ? "TOP DIVISION" : "RANKED"}</small></span>
            <span className="leaderboard-record">{player.wins}W – {player.losses}L</span>
            <span className="leaderboard-winrate">{winRate}%</span>
            <strong className="leaderboard-rating">{rating.toLocaleString()} <small>SR</small></strong>
          </div>;
        }) : <div className="board-empty">No architects match “{query}”.</div>}</div>
      </section>
    </div>
  </div></main>;
}
