"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Gamepad2, Play, Plus, Radio, Shield, Swords, UsersRound, X } from "lucide-react";

type Mode = "1v1" | "2v2" | "3v3";
type QueueStage = "idle" | "searching" | "found";
const modes: { id: Mode; title: string; icon: typeof Swords }[] = [
  { id: "1v1", title: "Duel", icon: Swords },
  { id: "2v2", title: "Duos", icon: UsersRound },
  { id: "3v3", title: "Squads", icon: Shield },
];
const matches = [
  { result: "W", opponent: "cachemiss", challenge: "Ticket onsale", change: "+31" },
  { result: "L", opponent: "nodezero", challenge: "Design a CDN", change: "−18" },
  { result: "W", opponent: "graphlord", challenge: "Live chat", change: "+26" },
];

export default function LobbyPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [queueStage, setQueueStage] = useState<QueueStage>("idle");
  const readyDialog = useRef<HTMLDialogElement>(null);
  const partySize = Number(mode[0]);

  useEffect(() => {
    const dialog = readyDialog.current;
    if (!dialog) return;
    if (queueStage === "found" && !dialog.open) dialog.showModal();
    if (queueStage !== "found" && dialog.open) dialog.close();
  }, [queueStage]);

  return <main className="game-shell">
    <aside className="game-rail" aria-label="Game navigation">
      <Link href="/" className="rail-logo" aria-label="SystemWars lobby"><span className="brand-mark">SW</span></Link>
      <nav className="rail-nav">
        <Link href="/" aria-current="page" className="rail-link rail-link-active" title="Play"><Gamepad2 size={22}/><span>PLAY</span></Link>
      </nav>
    </aside>
    <div className="game-main">
      <header className="game-topbar">
        <Link href="/" className="wordmark"><span className="wordmark-crest">SW</span><span>SYSTEM</span><strong>WARS</strong></Link>
        <nav className="game-tabs" aria-label="Main navigation">
          <Link href="/" className="game-tab game-tab-active" aria-current="page"><Gamepad2 size={17}/> PLAY</Link>
        </nav>
        <div className="topbar-right"><span className="topbar-player"><span className="player-avatar">A</span><span>ARCHITECT_01<small>DIAMOND II</small></span></span></div>
      </header>
      <section className="lobby-stage" aria-label="Competitive lobby">
        <div className="arena-art" aria-hidden="true"/>
        <div className="arena-light" aria-hidden="true"/>
        <div className="arena-trace" aria-hidden="true"/>
        <div className="stage-vignette" aria-hidden="true"/>
        <div className="stage-topline"><div className="stage-ticker" aria-label="Ranked formats: Duel 1v1, Duos 2v2, Squads 3v3"><div className="stage-ticker-track"><span>RANKED FORMATS <b>◆</b> DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span><span aria-hidden="true">RANKED FORMATS <b>◆</b> DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span></div></div></div>
        <section className="center-profile" id="rank" aria-label="Player profile">
          <div className="profile-emblem" aria-label="Profile emblem placeholder"><span className="profile-emblem-inner">A</span></div>
          <div className="profile-info"><span className="profile-kicker">PLAYER PROFILE</span><h1>ARCHITECT_01</h1><div className="profile-rank"><span className="profile-rank-glyph" aria-hidden="true">◇</span><strong>DIAMOND II</strong><span className="profile-rank-divider" /><span>1,640 SR</span></div></div>
          <div className="profile-statline"><span><b>62%</b><small>WIN RATE</small></span><span><b>18–11</b><small>RECORD</small></span><span><b>#2,381</b><small>GLOBAL RANK</small></span></div>
        </section>
        <div className="lobby-bottom">
          <div className="mode-area"><div className="section-heading"><span>01 <b>/</b> SELECT FORMAT</span><span>RANKED PLAY</span></div>
            <div className="mode-list">{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={`mode-option ${mode === item.id ? "mode-option-active" : ""}`} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setQueueStage("idle"); }}><span className="mode-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="mode-copy"><strong>{item.id}</strong><small>{item.title.toUpperCase()}</small></span><ChevronRight size={17} className="mode-chevron"/></button>; })}</div>
          </div>
          <div className="queue-area"><div className="section-heading"><span>02 <b>/</b> YOUR PARTY</span><span>{partySize === 1 ? "SOLO" : `${partySize} PLAYERS`}</span></div>
            <div className="party-row"><span className="party-slot party-slot-self"><span>A</span><small>YOU</small></span>{Array.from({ length: partySize - 1 }, (_, index) => <span className="party-slot party-slot-open" key={index} style={{ animationDelay: `${index * 75}ms` }}><Plus size={22}/><small>OPEN</small></span>)}</div>
            <button type="button" className={`queue-button ${queueStage !== "idle" ? "queue-button-cancel" : ""}`} onClick={() => setQueueStage(queueStage === "idle" ? "searching" : "idle")}>{queueStage === "idle" ? <><Play size={19} fill="currentColor"/> FIND MATCH <ArrowRight size={20}/></> : <><X size={19}/> CANCEL SEARCH</>}</button>
            <div className="queue-footer" role="status" aria-live="polite">{queueStage === "searching" ? <><span className="queue-pulse"/> SEARCHING {mode} DEMO QUEUE <button type="button" onClick={() => setQueueStage("found")}>SIMULATE MATCH FOUND <ArrowRight size={13}/></button></> : <><Swords size={14}/> RANKED {mode} READY</>}</div>
          </div>
        </div>
      </section>
      <footer className="game-footer"><span><Radio size={15}/> RECENT MATCHES</span><div className="footer-matches">{matches.map(match => <div key={match.opponent} className="footer-match"><b className={match.result === "W" ? "result-win" : "result-loss"}>{match.result}</b><span>vs. {match.opponent}<small>{match.challenge}</small></span><strong className={match.result === "W" ? "result-win" : "result-loss"}>{match.change} SR</strong></div>)}</div></footer>
    </div>
    <dialog ref={readyDialog} onCancel={(event) => { event.preventDefault(); setQueueStage("idle"); }} aria-labelledby="ready-title" aria-describedby="ready-description" className="ready-dialog">
      <div className="ready-top"><span>MATCH FOUND <b>/</b> DEMO</span><button type="button" onClick={() => setQueueStage("idle")} aria-label="Close ready check"><X size={19}/></button></div>
      <div className="ready-body"><span className="ready-symbol"><Swords size={35}/></span><h2 id="ready-title">READY CHECK</h2><p id="ready-description">A match has been found in this UI preview. No opponent or live server is connected.</p><div className="ready-meta"><span>FORMAT <strong>RANKED {mode}</strong></span><span>CHALLENGE <strong>TICKET ONSALE</strong></span></div></div>
      <div className="ready-actions"><button type="button" onClick={() => setQueueStage("idle")}>DECLINE</button><Link href={`/match?mode=${mode}`} onClick={() => setQueueStage("idle")}>ENTER DEMO MATCH <ArrowRight size={17}/></Link></div>
    </dialog>
  </main>;
}
