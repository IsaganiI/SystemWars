"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Play, Plus, Shield, Swords, UsersRound, X } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { PlayerAvatar } from "@/components/player-avatar";

type Mode = "1v1" | "2v2" | "3v3";
type QueueStage = "idle" | "searching" | "found" | "accepted";
type QueuePlayer = { name: string; team: number; you: boolean };
type QueueResponse = { status: "idle" | "waiting" | "found" | "ready" | "cancelled"; mode?: Mode; matchId?: string; players?: QueuePlayer[]; error?: string };
const modes: { id: Mode; title: string; icon: typeof Swords }[] = [
  { id: "1v1", title: "Duel", icon: Swords },
  { id: "2v2", title: "Duos", icon: UsersRound },
  { id: "3v3", title: "Squads", icon: Shield },
];
export default function LobbyPage({ playerHandle, userId, ratings = {}, recentRatingDeltas = {} }: { playerHandle: string; userId: string; ratings?: Partial<Record<Mode, number>>; recentRatingDeltas?: Partial<Record<Mode, number>> }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("1v1");
  const [queueStage, setQueueStage] = useState<QueueStage>("idle");
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [queueError, setQueueError] = useState("");
  const readyDialog = useRef<HTMLDialogElement>(null);
  const partySize = Number(mode[0]);
  const rating = ratings[mode] ?? 1000;
  const recentDelta = recentRatingDeltas[mode];
  const ownTeam = queuePlayers.find(player => player.you)?.team;
  const opponents = queuePlayers.filter(player => player.team !== ownTeam);
  const queueStatus = queueError || (queueStage === "searching" ? `SEARCHING FOR ${mode} PLAYERS` : queueStage === "accepted" ? "WAITING FOR READY CHECKS" : "");

  const applyQueueState = useCallback((state: QueueResponse) => {
    if (state.mode) setMode(state.mode);
    if (state.players) setQueuePlayers(state.players);
    if (state.status === "waiting") setQueueStage("searching");
    else if (state.status === "found") setQueueStage("found");
    else if (state.status === "ready" && state.matchId) router.push(`/match?id=${encodeURIComponent(state.matchId)}`);
    else if (state.status === "cancelled") { setQueueStage("idle"); setQueueError("A player left the match. Find another."); }
    else if (state.status === "idle") setQueueStage("idle");
  }, [router]);

  useEffect(() => {
    const dialog = readyDialog.current;
    if (!dialog) return;
    if (queueStage === "found" && !dialog.open) dialog.showModal();
    if (queueStage !== "found" && dialog.open) dialog.close();
  }, [queueStage]);

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding").then(response => response.json()).then(body => {
      if (active && body.profile?.preferredMode) setMode(body.profile.preferredMode);
    }).catch(() => {});
    fetch("/api/matchmaking").then(response => response.json()).then(body => {
      if (active) applyQueueState(body);
    }).catch(() => {});
    return () => { active = false; };
  }, [userId, applyQueueState]);

  useEffect(() => {
    if (queueStage === "idle") return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/matchmaking");
        if (active && response.ok) applyQueueState(await response.json());
      } catch { if (active) setQueueError("Connection lost. Retry or cancel the queue."); }
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [queueStage, userId, applyQueueState]);

  async function startQueue() {
    setQueueError("");
    setQueueStage("searching");
    try {
      const response = await fetch("/api/matchmaking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const state = await response.json();
      if (!response.ok) {
        setQueueStage("idle");
        if (response.status === 409) router.push("/onboarding");
        else setQueueError(state.error ?? "Could not join the queue.");
        return;
      }
      applyQueueState(state);
    } catch { setQueueStage("idle"); setQueueError("Could not join the queue."); }
  }

  async function cancelQueue() {
    setQueueStage("idle");
    setQueuePlayers([]);
    try { await fetch("/api/matchmaking", { method: "DELETE" }); }
    catch { setQueueError("Could not leave the queue. Try again."); }
  }

  async function acceptMatch() {
    try {
      const response = await fetch("/api/matchmaking/accept", { method: "POST" });
      if (!response.ok) { setQueueError("The match is no longer available."); await cancelQueue(); return; }
      setQueueStage("accepted");
    } catch { setQueueError("Could not accept the match."); }
  }

  return <main className="game-shell">
    <GameRail active="play"/>
    <div className="game-main">
      <GameTopbar active="play" playerHandle={playerHandle}/>
      <section className="play-screen" aria-label="Ranked play">
        <div className="play-screen-head"><div className="play-title"><span className="play-eyebrow">MATCHMAKING</span><h1><span>FIND A</span><span>MATCH</span></h1></div><div className="play-mode-list" aria-label="Choose match format">{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} disabled={queueStage !== "idle"} className={`play-mode ${mode === item.id ? "play-mode-active" : ""}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><span className="play-mode-icon"><Icon size={23} strokeWidth={1.7}/></span><strong>{item.id}</strong></button>; })}</div></div>
        <div className="play-layout">
          <div className="play-left-stack">
            <section className="play-identity" aria-label="Player profile">
              <div className="play-card-portrait"><PlayerAvatar alt={`${playerHandle}'s avatar`}/></div>
              <div className="play-slot-info"><span className="play-slot-label">YOUR PROFILE</span><strong>{playerHandle}</strong></div>
              <div className="play-slot-rank"><Shield size={27} strokeWidth={1.7}/><strong>UNRANKED</strong><span className="play-slot-rating">{rating.toLocaleString()} <small>SR</small></span><span className={`play-slot-trend ${recentDelta === undefined || recentDelta === 0 ? "play-slot-trend-neutral" : recentDelta > 0 ? "play-slot-trend-up" : "play-slot-trend-down"}`} title={recentDelta === undefined ? "No recent ranked results" : `Recent rating change: ${recentDelta > 0 ? "+" : ""}${recentDelta}`} aria-label={recentDelta === undefined ? "No recent ranked results" : `Recent rating change ${recentDelta > 0 ? "+" : ""}${recentDelta}`}>{recentDelta === undefined || recentDelta === 0 ? "—" : recentDelta > 0 ? <><ArrowUpRight size={17}/>{`+${recentDelta}`}</> : <><ArrowDownRight size={17}/>{recentDelta}</>}</span></div>
              <div className="play-profile-foot"><Link href="/account">VIEW PROFILE <ArrowRight size={16}/></Link></div>
            </section>
            {partySize > 1 && <section className="play-party" aria-label="Your party"><span>YOUR PARTY</span><div className="play-party-slots"><span className="play-party-self">{playerHandle?.slice(0,1).toUpperCase() ?? "?"}<small>YOU</small></span>{Array.from({ length: partySize - 1 }, (_, index) => <span className="play-party-open" key={index}><Plus size={20}/><small>OPEN</small></span>)}</div></section>}
          </div>
          <section className={`play-queue play-queue-${queueStage}`} aria-label="Matchmaking">
            <div className="play-queue-orbit"><div className="play-queue-crest"><Swords size={46} strokeWidth={1.4}/></div></div>
            <div className="play-queue-heading"><h2>{queueStage === "searching" ? "Finding a match" : queueStage === "accepted" ? "Waiting for players" : "Ready to play"}</h2></div>
            <div className="play-queue-action"><button type="button" className={`play-find-button ${queueStage !== "idle" ? "play-find-cancel" : ""}`} onClick={queueStage === "idle" ? startQueue : cancelQueue}>{queueStage === "idle" ? <><Play size={18} fill="currentColor"/> FIND MATCH <ArrowRight size={20}/></> : <><X size={18}/> {queueStage === "accepted" ? "LEAVE MATCH" : "CANCEL SEARCH"}</>}</button><div className="play-queue-status" role="status" aria-live="polite">{queueStatus}</div></div>
          </section>
        </div>
      </section>
    </div>
    <dialog ref={readyDialog} onCancel={(event) => { event.preventDefault(); void cancelQueue(); }} aria-labelledby="ready-title" aria-describedby="ready-description" className="ready-dialog">
      <div className="ready-top"><span><span className="ready-live-dot"/> RANKED {mode} <b>/</b> READY CHECK</span><button type="button" onClick={cancelQueue} aria-label="Decline match"><X size={19}/></button></div>
      <div className="ready-body"><span className="ready-eyebrow">PLAYERS FOUND</span><h2 id="ready-title">Match ready</h2><p id="ready-description">Ticket onsale <span>·</span> Accept to enter the build phase</p>
        <div className="ready-matchup"><div className="ready-player"><span className="ready-player-mark">{playerHandle?.slice(0, 1).toUpperCase() ?? "?"}</span><small>YOUR SIDE</small><strong>{playerHandle?.toUpperCase()}</strong><em>{mode} TEAM</em></div><span className="ready-versus">VS</span><div className="ready-player ready-rival"><span className="ready-player-mark">{opponents[0]?.name.slice(0, 1).toUpperCase() ?? "?"}</span><small>OPPOSING SIDE</small><strong>{opponents[0]?.name.toUpperCase() ?? "PLAYERS FOUND"}{opponents.length > 1 ? ` +${opponents.length - 1}` : ""}</strong><em>{mode} TEAM</em></div></div>
      </div>
      <div className="ready-actions"><button type="button" onClick={cancelQueue}>DECLINE</button><button type="button" onClick={acceptMatch}>ACCEPT MATCH <ArrowRight size={17}/></button></div>
    </dialog>
  </main>;
}
