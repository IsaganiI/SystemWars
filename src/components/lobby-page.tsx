"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Play, Shield, Swords, UsersRound, X } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { PlayerAvatar } from "@/components/player-avatar";
import { rankName, rankTone } from "@/lib/rank-tone";

type Mode = "1v1" | "2v2" | "3v3";
type QueueStage = "idle" | "searching" | "found" | "accepted";
type QueuePlayer = { name: string; team: number; you: boolean };
type QueueResponse = { status: "idle" | "waiting" | "found" | "ready" | "cancelled"; mode?: Mode; matchId?: string; isNpc?: boolean; players?: QueuePlayer[]; error?: string };
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
  const [isNpc, setIsNpc] = useState(false);
  const [queueError, setQueueError] = useState("");
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [modesMounted, setModesMounted] = useState(true);
  const readyDialog = useRef<HTMLDialogElement>(null);
  const rating = ratings[mode] ?? 1000;
  const recentDelta = recentRatingDeltas[mode];
  const ownTeam = queuePlayers.find(player => player.you)?.team;
  const opponents = queuePlayers.filter(player => player.team !== ownTeam);

  useEffect(() => {
    if (queueStage !== "searching") return;
    const started = Date.now();
    const timer = window.setInterval(() => setSearchSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [queueStage]);

  useEffect(() => {
    if (queueStage === "idle") {
      const frame = window.requestAnimationFrame(() => setModesMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setModesMounted(false), 500);
    return () => window.clearTimeout(timer);
  }, [queueStage]);

  const applyQueueState = useCallback((state: QueueResponse) => {
    if (state.mode) setMode(state.mode);
    if (state.players) setQueuePlayers(state.players);
    if (state.isNpc !== undefined) setIsNpc(state.isNpc);
    if (state.status === "waiting") setQueueStage("searching");
    else if (state.status === "found") setQueueStage("found");
    else if (state.status === "ready" && state.matchId) router.push(`/veto?id=${encodeURIComponent(state.matchId)}`);
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
    setIsNpc(false);
    setSearchSeconds(0);
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
    setIsNpc(false);
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
        <div className="play-atmosphere" aria-hidden="true"><i/><i/><i/></div>
        <div className="play-screen-head"><div className="play-title"><span className="play-eyebrow">MATCHMAKING</span><h1><span>FIND A</span><span>MATCH</span></h1></div></div>
        <div className="play-layout">
          <div className="play-left-stack">
            <section className="play-identity" aria-label="Player profile">
              <div className="play-card-portrait"><PlayerAvatar alt={`${playerHandle}'s avatar`}/></div>
              <div className="play-slot-info"><span className="play-slot-label">YOUR PROFILE</span><strong>{playerHandle}</strong></div>
              <div className="play-slot-rank"><Shield size={27} strokeWidth={1.7}/><strong>{rankName(ratings[mode])}</strong><span className="play-slot-rating">{rating.toLocaleString()} <small>SR</small></span><span className={`play-slot-trend ${recentDelta === undefined || recentDelta === 0 ? "play-slot-trend-neutral" : recentDelta > 0 ? "play-slot-trend-up" : "play-slot-trend-down"}`} title={recentDelta === undefined ? "No recent ranked results" : `Recent rating change: ${recentDelta > 0 ? "+" : ""}${recentDelta}`} aria-label={recentDelta === undefined ? "No recent ranked results" : `Recent rating change ${recentDelta > 0 ? "+" : ""}${recentDelta}`}>{recentDelta === undefined || recentDelta === 0 ? "—" : recentDelta > 0 ? <><ArrowUpRight size={17}/>{`+${recentDelta}`}</> : <><ArrowDownRight size={17}/>{recentDelta}</>}</span></div>
              <div className="play-profile-foot"><Link href="/account">VIEW PROFILE <ArrowRight size={16}/></Link></div>
            </section>
          </div>
          <section className={`play-queue play-queue-${queueStage}`} aria-label="Matchmaking">
            {modesMounted && <h2 className={`play-mode-heading ${queueStage !== "idle" ? "play-mode-heading-exit" : ""}`}>CHOOSE YOUR <span>FIGHT</span></h2>}
            {modesMounted && <div className={`play-mode-list play-queue-modes ${queueStage !== "idle" ? "play-queue-modes-exit" : ""}`} aria-label="Choose match format" aria-hidden={queueStage !== "idle"}>{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} disabled={queueStage !== "idle"} className={`play-mode ${mode === item.id ? "play-mode-active" : ""}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><span className="play-mode-icon"><Icon size={23} strokeWidth={1.7}/></span><strong>{item.id}</strong></button>; })}</div>}
            <div className="play-queue-orbit"><div className="play-queue-crest"><Swords size={46} strokeWidth={1.4}/></div></div>
            {queueStage !== "idle" && <div className="play-queue-heading"><h2>{queueStage === "searching" ? <><span className="play-search-lead">FINDING A</span><em>MATCH</em></> : <>WAITING FOR <em>PLAYERS</em></>}</h2></div>}
            {queueStage === "searching" && <div className="play-search-readout" aria-label={`${searchSeconds} seconds in queue`}><Clock3 className="play-search-clock-icon" size={25} strokeWidth={2.2}/><strong>{String(Math.floor(searchSeconds / 60)).padStart(2, "0")}:{String(searchSeconds % 60).padStart(2, "0")}</strong></div>}
            <div className="play-queue-action"><button type="button" className={`play-find-button ${queueStage !== "idle" ? "play-find-cancel" : ""}`} onClick={queueStage === "idle" ? startQueue : cancelQueue}>{queueStage === "idle" ? <><span className="play-find-button-icon"><Play size={19} fill="currentColor"/></span><span>FIND MATCH</span><span className="play-find-button-arrow"><ArrowRight size={24}/></span></> : <><X size={18}/> {queueStage === "accepted" ? "LEAVE MATCH" : "CANCEL SEARCH"}</>}</button>{queueError && <div className="play-queue-error" role="alert">{queueError}</div>}</div>
            {modesMounted && <p className={`play-center-motto ${queueStage !== "idle" ? "play-center-motto-exit" : ""}`}>BUILD TO WIN<span aria-hidden="true"/></p>}
          </section>
        </div>
      </section>
    </div>
    <dialog ref={readyDialog} onCancel={(event) => { event.preventDefault(); void cancelQueue(); }} aria-labelledby="ready-title" className="ready-dialog">
      <div className={`ready-scene ready-rank-${rankTone(ratings[mode])}`}>
        <div className="ready-beams" aria-hidden="true"/>
        <button type="button" className="ready-close" onClick={cancelQueue} aria-label="Decline match"><X size={21}/></button>
        <div className="ready-heading"><span className="ready-mode"><Swords size={16}/> {isNpc ? "SYSTEM AI · PRACTICE" : `${mode.toUpperCase()} ${mode === "1v1" ? "DUEL" : mode === "2v2" ? "DUOS" : "SQUADS"}`}</span><h2 id="ready-title"><span>{isNpc ? "AI" : "MATCH"}</span><em data-text="FOUND">FOUND</em></h2></div>
        <div className="ready-matchup">
          <div className="ready-player"><span className="ready-player-mark"><PlayerAvatar alt={`${playerHandle}'s avatar`}/></span><div className="ready-player-name"><small>YOUR SIDE</small><strong>{playerHandle}</strong></div><span className="ready-player-corner" aria-hidden="true">01</span></div>
          <span className="ready-versus" role="img" aria-label="versus"><span className="ready-versus-burst" aria-hidden="true"/><b aria-hidden="true">V</b><i aria-hidden="true"/><b aria-hidden="true">S</b></span>
          <div className="ready-player ready-rival"><span className="ready-player-mark">{opponents[0]?.name.slice(0, 1).toUpperCase() ?? "?"}</span><div className="ready-player-name"><small>{isNpc ? "AI CHALLENGER · NO SR" : "OPPOSING SIDE"}</small><strong>{opponents[0]?.name ?? "Opponent"}{opponents.length > 1 ? ` +${opponents.length - 1}` : ""}</strong></div><span className="ready-player-corner" aria-hidden="true">02</span></div>
        </div>
        <div className="ready-actions"><button type="button" onClick={cancelQueue}>DECLINE</button><button type="button" onClick={acceptMatch}><span>ACCEPT MATCH</span><span className="ready-accept-arrow"><ArrowRight size={25}/></span></button></div>
      </div>
    </dialog>
  </main>;
}
