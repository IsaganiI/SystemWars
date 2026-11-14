"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Play, Plus, Radio, Shield, Swords, UsersRound, X } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { authClient } from "@/lib/auth-client";

type Mode = "1v1" | "2v2" | "3v3";
type QueueStage = "idle" | "searching" | "found" | "accepted";
type QueuePlayer = { name: string; team: number; you: boolean };
type QueueResponse = { status: "idle" | "waiting" | "found" | "ready" | "cancelled"; mode?: Mode; matchId?: string; players?: QueuePlayer[]; error?: string };
const modes: { id: Mode; title: string; icon: typeof Swords }[] = [
  { id: "1v1", title: "Duel", icon: Swords },
  { id: "2v2", title: "Duos", icon: UsersRound },
  { id: "3v3", title: "Squads", icon: Shield },
];
export default function LobbyPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const playerHandle = session?.user.displayUsername ?? session?.user.username ?? session?.user.name;
  const [mode, setMode] = useState<Mode>("1v1");
  const [queueStage, setQueueStage] = useState<QueueStage>("idle");
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [queueError, setQueueError] = useState("");
  const readyDialog = useRef<HTMLDialogElement>(null);
  const partySize = Number(mode[0]);
  const ownTeam = queuePlayers.find(player => player.you)?.team;
  const opponents = queuePlayers.filter(player => player.team !== ownTeam);

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
    if (!session?.user.id) return;
    let active = true;
    fetch("/api/onboarding").then(response => response.json()).then(body => {
      if (active && body.profile?.preferredMode) setMode(body.profile.preferredMode);
    }).catch(() => {});
    fetch("/api/matchmaking").then(response => response.json()).then(body => {
      if (active) applyQueueState(body);
    }).catch(() => {});
    return () => { active = false; };
  }, [session?.user.id, applyQueueState]);

  useEffect(() => {
    if (queueStage === "idle" || !session?.user.id) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/matchmaking");
        if (active && response.ok) applyQueueState(await response.json());
      } catch { if (active) setQueueError("Connection lost. Retry or cancel the queue."); }
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [queueStage, session?.user.id, applyQueueState]);

  async function startQueue() {
    if (!session) { router.push("/register"); return; }
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
        {queueStage === "searching" || queueStage === "accepted" ? <section className="search-focus" aria-label={queueStage === "searching" ? "Searching for a match" : "Waiting for players"}><div className="search-ring"><Swords size={46} strokeWidth={1.4}/></div><span>RANKED {mode}</span><strong>{queueStage === "accepted" ? "Waiting for players" : "Finding a match"}</strong><small>{queueStage === "accepted" ? "Your ready check is complete" : "Searching for players in your format"}</small></section> : <section className="center-profile" id="rank" aria-label="Player profile">
          <div className="profile-emblem"><Shield className="new-player-mark" size={72} strokeWidth={1.2}/></div>
          <div className="profile-info"><span className="profile-kicker">{session ? "PLAYER PROFILE" : "JOIN SYSTEMWARS"}</span><h1>{playerHandle?.toUpperCase() ?? "CREATE YOUR PROFILE"}</h1><div className="profile-rank">{session ? <><span className="profile-rank-glyph" aria-hidden="true">◇</span><strong>UNRANKED</strong><span className="profile-rank-divider" /><span>0 SR</span></> : <Link href="/register" className="profile-join">CREATE ACCOUNT <ArrowRight size={15}/></Link>}</div></div>
        </section>}
        <div className="lobby-bottom">
          <div className="dock-title"><span>RANKED MATCHMAKING</span><span>CHOOSE YOUR FORMAT</span></div>
          <div className="dock-content">
          <div className="mode-area"><div className="section-heading"><span>FORMAT</span><span>{mode} SELECTED</span></div>
            <div className="mode-list">{modes.map(item => { const Icon = item.icon; return <button type="button" key={item.id} disabled={queueStage !== "idle"} className={`mode-option ${mode === item.id ? "mode-option-active" : ""}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><span className="mode-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="mode-copy"><strong>{item.id}</strong><small>{item.title.toUpperCase()}</small></span><ChevronRight size={17} className="mode-chevron"/></button>; })}</div>
          </div>
          <div className="queue-area"><div className="section-heading"><span>YOUR PARTY</span><span>{partySize === 1 ? "SOLO" : `${partySize} PLAYERS`}</span></div>
            <div className="party-row"><span className="party-slot party-slot-self"><span>{playerHandle?.slice(0, 1).toUpperCase() ?? "?"}</span><small>YOU</small></span>{Array.from({ length: partySize - 1 }, (_, index) => <span className="party-slot party-slot-open" key={index} style={{ animationDelay: `${index * 75}ms` }}><Plus size={22}/><small>OPEN</small></span>)}</div>
            <button type="button" className={`queue-button ${queueStage !== "idle" ? "queue-button-cancel" : ""}`} onClick={queueStage === "idle" ? startQueue : cancelQueue}>{queueStage === "idle" ? <><Play size={19} fill="currentColor"/> FIND MATCH <ArrowRight size={20}/></> : <><X size={19}/> {queueStage === "accepted" ? "LEAVE MATCH" : "CANCEL SEARCH"}</>}</button>
            <div className="queue-footer" role="status" aria-live="polite">{queueError ? <span className="queue-error">{queueError}</span> : queueStage === "searching" ? <><span className="queue-pulse"/> SEARCHING FOR {mode} PLAYERS</> : queueStage === "accepted" ? <><span className="queue-pulse"/> WAITING FOR READY CHECKS</> : <><Swords size={14}/> RANKED {mode} READY</>}</div>
          </div>
          </div>
        </div>
      </section>
      <footer className="game-footer"><span><Radio size={15}/> MATCH HISTORY</span><div className="footer-empty">No completed matches yet.</div><Link href="/matches" className="footer-all">VIEW HISTORY <ArrowRight size={14}/></Link></footer>
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
