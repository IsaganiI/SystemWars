"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Clock3, Gamepad2, Menu, Play, Plus, Radio, Settings2, Shield, Swords, Trophy, UsersRound, X } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
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
        <Link href="/about" className="rail-link" title="About"><BookOpen size={21}/><span>ABOUT</span></Link>
        <Link href="/results" className="rail-link" title="Results"><Trophy size={21}/><span>RESULTS</span></Link>
      </nav>
      <div className="rail-bottom">UI PREVIEW</div>
    </aside>
    <div className="game-main">
      <header className="game-topbar">
        <button className="mobile-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={20}/></button>
        <Link href="/" className="wordmark"><span className="wordmark-crest">SW</span><span>SYSTEM</span><strong>WARS</strong></Link>
        <nav className={`game-tabs ${menuOpen ? "game-tabs-open" : ""}`} aria-label="Main navigation">
          <Link href="/" className="game-tab game-tab-active" aria-current="page"><Gamepad2 size={17}/> PLAY</Link>
          <Link href="/about" className="game-tab"><BookOpen size={16}/> ABOUT</Link>
          <Link href="/results" className="game-tab"><Trophy size={16}/> RESULTS</Link>
        </nav>
        <div className="topbar-right"><span className="topbar-status"><i/> ONLINE</span><span className="topbar-build">SEASON 00 <span>/</span> PREVIEW</span><Link href="/about" className="topbar-icon" aria-label="About SystemWars"><Settings2 size={18}/></Link><span className="topbar-player"><span className="player-avatar">A</span><span>ARCHITECT_01<small>DIAMOND II</small></span></span></div>
      </header>
      <section className="lobby-stage" aria-label="Competitive lobby">
        <div className="arena-art" aria-hidden="true"/>
        <div className="arena-light" aria-hidden="true"/>
        <div className="arena-trace" aria-hidden="true"/>
        <div className="stage-vignette" aria-hidden="true"/>
        <div className="stage-topline"><span className="live-indicator"><i/> COMPETITIVE LOBBY</span><div className="stage-ticker" aria-label="Preview feed: Ranked Duel 1v1, Duos 2v2, Squads 3v3"><div className="stage-ticker-track"><span>PREVIEW FEED <b>◆</b> RANKED DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span><span aria-hidden="true">PREVIEW FEED <b>◆</b> RANKED DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span></div></div><span className="stage-region">US EAST <b>●</b> ONLINE</span></div>
        <div className="stage-heading"><span className="eyebrow">SYSTEMWARS <b>/</b> RANKED</span><h1>MAKE YOUR<br/><em>MARK.</em></h1><p>Choose your format. Enter the arena.</p></div>
        <div className="player-plaque" id="rank">
          <span className="plaque-kicker">YOUR COMPETITIVE PROFILE</span>
          <div className="plaque-main"><span className="rank-placeholder" aria-label="Rank emblem placeholder">◇</span><div><strong>Diamond II</strong><small>1,640 SR <span>▲ +31</span></small></div></div>
          <div className="plaque-rule"><i/></div>
          <div className="plaque-stats"><span><b>62%</b><small>WIN RATE</small></span><span><b>18—11</b><small>RECORD</small></span><span><b>#2,381</b><small>GLOBAL</small></span></div>
          <span className="sample-note">SAMPLE PLAYER DATA</span>
        </div>
        <div className="lobby-bottom">
          <div className="mode-area"><div className="section-heading"><span>01 <b>/</b> SELECT FORMAT</span><span>RANKED PLAY</span></div>
            <div className="mode-list">{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={`mode-option ${mode === item.id ? "mode-option-active" : ""}`} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setQueueStage("idle"); }}><span className="mode-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="mode-copy"><strong>{item.id}</strong><small>{item.title.toUpperCase()}</small></span><ChevronRight size={17} className="mode-chevron"/></button>; })}</div>
          </div>
          <div className="queue-area"><div className="section-heading"><span>02 <b>/</b> YOUR PARTY</span><span>{partySize === 1 ? "SOLO" : `${partySize} PLAYERS`}</span></div>
            <div className="party-row"><span className="party-slot party-slot-self"><span>A</span><small>YOU</small></span>{Array.from({ length: partySize - 1 }, (_, index) => <span className="party-slot party-slot-open" key={index} style={{ animationDelay: `${index * 75}ms` }}><Plus size={22}/><small>OPEN</small></span>)}</div>
            <button type="button" className={`queue-button ${queueStage !== "idle" ? "queue-button-cancel" : ""}`} onClick={() => setQueueStage(queueStage === "idle" ? "searching" : "idle")}>{queueStage === "idle" ? <><Play size={19} fill="currentColor"/> FIND MATCH <ArrowRight size={20}/></> : <><X size={19}/> CANCEL SEARCH</>}</button>
            <div className="queue-footer" role="status" aria-live="polite">{queueStage === "searching" ? <><span className="queue-pulse"/> SEARCHING {mode} QUEUE <button type="button" onClick={() => setQueueStage("found")}>PREVIEW MATCH FOUND <ArrowRight size={13}/></button></> : <><Clock3 size={14}/> MATCHMAKING UI PREVIEW</>}</div>
          </div>
        </div>
      </section>
      <footer className="game-footer"><span><Radio size={15}/> MATCH HISTORY</span><div className="footer-matches">{matches.map(match => <Link href="/results" key={match.opponent} className="footer-match"><b className={match.result === "W" ? "result-win" : "result-loss"}>{match.result}</b><span>vs. {match.opponent}<small>{match.challenge}</small></span><strong className={match.result === "W" ? "result-win" : "result-loss"}>{match.change} SR</strong></Link>)}</div><Link href="/results" className="footer-all">VIEW ALL <ArrowRight size={15}/></Link></footer>
    </div>
    <dialog ref={readyDialog} onCancel={(event) => { event.preventDefault(); setQueueStage("idle"); }} aria-labelledby="ready-title" aria-describedby="ready-description" className="ready-dialog">
      <div className="ready-top"><span>MATCH FOUND <b>/</b> PREVIEW</span><button type="button" onClick={() => setQueueStage("idle")} aria-label="Close ready check"><X size={19}/></button></div>
      <div className="ready-body"><span className="ready-symbol"><Swords size={35}/></span><h2 id="ready-title">READY CHECK</h2><p id="ready-description">A match has been found in this UI preview. No opponent or live server is connected.</p><div className="ready-meta"><span>FORMAT <strong>RANKED {mode}</strong></span><span>CHALLENGE <strong>TICKET ONSALE</strong></span></div></div>
      <div className="ready-actions"><button type="button" onClick={() => setQueueStage("idle")}>DECLINE</button><Link href={`/match?mode=${mode}`} onClick={() => setQueueStage("idle")}>ENTER MATCH PREVIEW <ArrowRight size={17}/></Link></div>
    </dialog>
  </main>;
}
