"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Play, Plus, Radio, Shield, Swords, UsersRound, X } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";

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

function DiamondRankMark() {
  return <svg className="diamond-rank-mark" viewBox="0 0 160 180" role="img" aria-label="Diamond rank emblem">
    <path d="M80 4 148 43v91l-68 42-68-42V43Z" fill="#d7efff"/>
    <path d="M80 11 141 47v83l-61 38-61-38V47Z" fill="#70b4f7"/>
    <path d="M80 25 128 53v68l-48 31-48-31V53Z" fill="#192b4a" stroke="#c6eaff" strokeWidth="3"/>
    <path d="M80 35 118 58v59l-38 25-38-25V58Z" fill="#1d3152"/>
    <circle cx="80" cy="87" r="28" fill="none" stroke="#b8e7ff" strokeWidth="5"/>
    <path d="M52 87h56M80 59v56M67 63c-11 13-11 35 0 48M93 63c11 13 11 35 0 48" fill="none" stroke="#b8e7ff" strokeWidth="4" strokeLinecap="round"/>
    <path d="M30 42 80 13l50 29" fill="none" stroke="#f0f8ff" strokeWidth="4" opacity=".8"/>
  </svg>;
}

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
    <GameRail active="play"/>
    <div className="game-main">
      <GameTopbar active="play"/>
      <section className="lobby-stage" aria-label="Competitive lobby">
        <div className="arena-art" aria-hidden="true"/>
        <div className="stage-vignette" aria-hidden="true"/>
        <svg className="route-flow" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <path className="route-packet route-packet-one" pathLength="1000" d="M0 140h305l102 88h160"/>
          <path className="route-packet route-packet-two" pathLength="1000" d="M1600 360h-220l-130-92h-195"/>
          <path className="route-packet route-packet-three" pathLength="1000" d="M0 622h275l115-112h185"/>
          <path className="route-packet route-packet-four" pathLength="1000" d="M1600 758h-330l-85-81h-150"/>
        </svg>
        <div className="stage-topline"><div className="stage-ticker" aria-label="Ranked formats: Duel 1v1, Duos 2v2, Squads 3v3"><div className="stage-ticker-track"><span>RANKED FORMATS <b>◆</b> DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span><span aria-hidden="true">RANKED FORMATS <b>◆</b> DUEL 1v1 <b>◆</b> DUOS 2v2 <b>◆</b> SQUADS 3v3 <b>◆</b></span></div></div></div>
        <section className="center-profile" id="rank" aria-label="Player profile">
          <div className="profile-emblem"><DiamondRankMark/></div>
          <div className="profile-info"><span className="profile-kicker">PLAYER PROFILE</span><h1>ARCHITECT_01</h1><div className="profile-rank"><span className="profile-rank-glyph" aria-hidden="true">◇</span><strong>DIAMOND II</strong><span className="profile-rank-divider" /><span>1,965 SR</span></div></div>
        </section>
        <div className="lobby-bottom">
          <div className="dock-title"><span>RANKED MATCHMAKING</span><span>CHOOSE YOUR FORMAT</span></div>
          <div className="dock-content">
          <div className="mode-area"><div className="section-heading"><span>FORMAT</span><span>{mode} SELECTED</span></div>
            <div className="mode-list">{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={`mode-option ${mode === item.id ? "mode-option-active" : ""}`} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setQueueStage("idle"); }}><span className="mode-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="mode-copy"><strong>{item.id}</strong><small>{item.title.toUpperCase()}</small></span><ChevronRight size={17} className="mode-chevron"/></button>; })}</div>
          </div>
          <div className="queue-area"><div className="section-heading"><span>YOUR PARTY</span><span>{partySize === 1 ? "SOLO" : `${partySize} PLAYERS`}</span></div>
            <div className="party-row"><span className="party-slot party-slot-self"><span>A</span><small>YOU</small></span>{Array.from({ length: partySize - 1 }, (_, index) => <span className="party-slot party-slot-open" key={index} style={{ animationDelay: `${index * 75}ms` }}><Plus size={22}/><small>OPEN</small></span>)}</div>
            <button type="button" className={`queue-button ${queueStage !== "idle" ? "queue-button-cancel" : ""}`} onClick={() => setQueueStage(queueStage === "idle" ? "searching" : "idle")}>{queueStage === "idle" ? <><Play size={19} fill="currentColor"/> FIND MATCH <ArrowRight size={20}/></> : <><X size={19}/> CANCEL SEARCH</>}</button>
            <div className="queue-footer" role="status" aria-live="polite">{queueStage === "searching" ? <><span className="queue-pulse"/> SEARCHING {mode} DEMO QUEUE <button type="button" onClick={() => setQueueStage("found")}>SIMULATE MATCH FOUND <ArrowRight size={13}/></button></> : <><Swords size={14}/> RANKED {mode} READY</>}</div>
          </div>
          </div>
        </div>
      </section>
      <footer className="game-footer"><span><Radio size={15}/> RECENT MATCHES</span><div className="footer-matches">{matches.map(match => <Link href="/matches" key={match.opponent} className="footer-match"><b className={match.result === "W" ? "result-win" : "result-loss"}>{match.result}</b><span>vs. {match.opponent}<small>{match.challenge}</small></span><strong className={match.result === "W" ? "result-win" : "result-loss"}>{match.change} SR</strong></Link>)}</div></footer>
    </div>
    <dialog ref={readyDialog} onCancel={(event) => { event.preventDefault(); setQueueStage("idle"); }} aria-labelledby="ready-title" aria-describedby="ready-description" className="ready-dialog">
      <div className="ready-top"><span>MATCH FOUND <b>/</b> DEMO</span><button type="button" onClick={() => setQueueStage("idle")} aria-label="Close ready check"><X size={19}/></button></div>
      <div className="ready-body"><span className="ready-symbol"><Swords size={35}/></span><h2 id="ready-title">READY CHECK</h2><p id="ready-description">A match has been found in this UI preview. No opponent or live server is connected.</p><div className="ready-meta"><span>FORMAT <strong>RANKED {mode}</strong></span><span>CHALLENGE <strong>TICKET ONSALE</strong></span></div></div>
      <div className="ready-actions"><button type="button" onClick={() => setQueueStage("idle")}>DECLINE</button><Link href={`/match?mode=${mode}`} onClick={() => setQueueStage("idle")}>ENTER DEMO MATCH <ArrowRight size={17}/></Link></div>
    </dialog>
  </main>;
}
