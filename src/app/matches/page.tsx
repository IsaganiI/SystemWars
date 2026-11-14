"use client";

import { useState } from "react";
import { History, SlidersHorizontal } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { matchHistory, type Mode } from "@/lib/demo-data";

type ResultFilter = "ALL" | "WINS" | "LOSSES";
type ModeFilter = "ALL" | Mode;

export default function MatchesPage() {
  const [resultFilter, setResultFilter] = useState<ResultFilter>("ALL");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("ALL");
  const [selectedId, setSelectedId] = useState(matchHistory[0].id);
  const visible = matchHistory.filter(match =>
    (resultFilter === "ALL" || (resultFilter === "WINS" ? match.result === "W" : match.result === "L")) &&
    (modeFilter === "ALL" || match.mode === modeFilter)
  );
  const selected = visible.find(match => match.id === selectedId) ?? visible[0];
  const wins = matchHistory.filter(match => match.result === "W").length;

  return <main className="game-shell"><GameRail active="matches"/><div className="game-main"><GameTopbar active="matches"/>
    <div className="subpage">
      <div className="page-head"><div><span className="page-kicker"><History size={16}/> PLAYER ARCHIVE / SAMPLE DATA</span><h1>PREVIOUS MATCHES</h1></div><div className="head-index"><span>RECENT RECORD</span><strong>{wins}–{matchHistory.length - wins}</strong><small>LAST {matchHistory.length} MATCHES</small></div></div>

      <div className="board-controls"><div className="control-caption"><SlidersHorizontal size={16}/> FILTER HISTORY</div><div className="mode-filter" role="group" aria-label="Filter by result">{(["ALL", "WINS", "LOSSES"] as ResultFilter[]).map(item => <button key={item} type="button" aria-pressed={resultFilter === item} onClick={() => setResultFilter(item)}>{item}</button>)}</div><div className="mode-filter" role="group" aria-label="Filter by format">{(["ALL", "1v1", "2v2", "3v3"] as ModeFilter[]).map(item => <button key={item} type="button" aria-pressed={modeFilter === item} onClick={() => setModeFilter(item)}>{item}</button>)}</div></div>

      <div className="match-layout"><section className="match-list" aria-label="Previous matches"><div className="board-label"><span>MATCH LOG</span><span>{visible.length} RECORDS</span></div>{visible.length ? visible.map(match => <button type="button" key={match.id} className={`match-row ${selected?.id === match.id ? "match-row-active" : ""}`} onClick={() => setSelectedId(match.id)} aria-pressed={selected?.id === match.id}>
        <span className={`match-result ${match.result === "W" ? "match-result-win" : "match-result-loss"}`}>{match.result === "W" ? "WIN" : "LOSS"}</span>
        <span className="match-main"><strong>{match.challenge}</strong><small>VS. {match.opponent} <b>·</b> RANKED {match.mode}</small></span>
        <span className="match-meta"><strong className={match.result === "W" ? "result-win" : "result-loss"}>{match.change > 0 ? "+" : ""}{match.change} SR</strong><small>{match.playedAt}</small></span>
      </button>) : <div className="board-empty">No matches match those filters.</div>}</section>

      <aside className="match-detail" aria-label="Selected match details">{selected ? <>
        <div className="board-label"><span>MATCH FILE / {selected.id}</span><span>{selected.playedAt}</span></div>
        <div className={`detail-result ${selected.result === "W" ? "detail-result-win" : "detail-result-loss"}`}>{selected.result === "W" ? "VICTORY" : "DEFEAT"}</div>
        <div className="detail-opponent">VS. <strong>{selected.opponent}</strong></div>
        <h2>{selected.challenge}</h2>
        <div className="detail-mode">RANKED {selected.mode} <span>·</span> {selected.change > 0 ? "+" : ""}{selected.change} SR</div>
        <div className="detail-metrics"><div><span>REQUESTS COMPLETED</span><strong>{selected.served}</strong></div><div><span>P95 LATENCY</span><strong>{selected.latency}</strong></div><div><span>AVAILABILITY</span><strong>{selected.availability}</strong></div></div>
      </> : <div className="board-empty">Select a match to inspect it.</div>}</aside></div>
    </div>
  </div></main>;
}
