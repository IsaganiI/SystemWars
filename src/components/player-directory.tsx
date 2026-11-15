"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Search, UserPlus, UsersRound } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { FriendCodePanel } from "@/components/friend-code-panel";
import { RankEmblem } from "@/components/rank-emblem";
import { rankName, rankTone } from "@/lib/rank-tone";

type Player = { id: string; handle: string; rating: number | null; wins: number | null; losses: number | null; friendshipStatus: "pending" | "accepted" | null; requestedBy: string | null; acceptsRequests: boolean };
type Friend = { id: string; handle: string };

export function PlayerDirectory({ userId, handle, sharedCode }: { userId: string; handle: string; sharedCode?: string }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const [found, network] = await Promise.all([fetch(`/api/players?q=${encodeURIComponent(query)}`, { cache: "no-store" }), fetch("/api/friends", { cache: "no-store" })]);
    if (!found.ok || !network.ok) throw new Error("Could not load players.");
    const [playerData, friendData] = await Promise.all([found.json(), network.json()]);
    if (requestId !== latestRequest.current) return;
    setPlayers(playerData.players);
    setFriends(friendData.friends);
    setIncoming(friendData.incoming);
    setOutgoing(friendData.outgoing);
  }, [query]);

  useEffect(() => {
    let active = true;
    const requestCounter = latestRequest;
    const timer = window.setTimeout(() => { if (active) load().then(() => setError("")).catch(() => setError("Could not load players.")).finally(() => { if (active) setLoading(false); }); }, 180);
    return () => { active = false; requestCounter.current++; window.clearTimeout(timer); };
  }, [load]);

  async function act(targetId: string, action: string) {
    setBusyId(targetId);
    setError("");
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, action }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Could not update friendship."); }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update friendship."); }
    finally { setBusyId(null); }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/register`); setCopied(true); }
    catch { setError("Could not copy the invite link."); }
  }

  return <main className="game-shell"><GameRail active="players"/><div className="game-main"><GameTopbar active="players" playerHandle={handle}/><div className="subpage arena-page players-page competitive-page">
    <header className="arena-feature-head"><div className="arena-feature-copy"><h1>FIND <span>PLAYERS</span></h1></div></header>
    <div className="arena-command-bar"><label className="board-search roster-search"><Search size={20}/><input value={query} onChange={event => { setQuery(event.target.value); setLoading(true); }} maxLength={50} placeholder="SEARCH BY HANDLE" aria-label="Search players by handle"/></label><button className="roster-invite" type="button" onClick={copyInvite}><Copy size={19}/>{copied ? "LINK COPIED" : "INVITE A PLAYER"}</button></div>
    <FriendCodePanel sharedCode={sharedCode} onChange={() => { void load().catch(() => setError("Could not load players.")); }}/>
    {error && <p role="alert" className="roster-error">{error}</p>}
    {incoming.length > 0 && <section className="roster-section"><header><UserPlus size={21}/><h2>FRIEND REQUESTS</h2><span>{incoming.length}</span></header><div className="roster-grid">{incoming.map(player => <article className="roster-card roster-request" key={player.id}><Link href={`/players/${encodeURIComponent(player.id)}`} className="roster-card-main"><span className="roster-card-avatar">{player.handle[0]?.toUpperCase()}</span><span className="roster-card-identity"><strong>{player.handle}</strong><small>WANTS TO JOIN YOUR NETWORK</small></span><ArrowRight size={23}/></Link><div className="roster-card-actions"><button disabled={busyId === player.id} onClick={() => act(player.id, "accept")}>ACCEPT</button><button disabled={busyId === player.id} onClick={() => act(player.id, "decline")}>DECLINE</button></div></article>)}</div></section>}
    <section className="roster-section">{loading ? <div className="roster-empty"><strong>SEARCHING THE ARENA</strong></div> : players.length ? <div className="roster-grid">{players.map(player => <article className={`roster-card roster-rank-${rankTone(player.rating ?? undefined)}`} key={player.id}><Link href={`/players/${encodeURIComponent(player.id)}`} className="roster-card-main"><span className="roster-card-avatar">{player.handle[0]?.toUpperCase()}</span><span className="roster-card-identity"><strong>{player.handle}</strong><small><RankEmblem rating={player.rating ?? undefined} size={22}/>{rankName(player.rating ?? undefined).toUpperCase()}</small></span><ArrowRight size={24}/></Link><div className="roster-card-footer"><span>{(player.rating ?? 1000).toLocaleString()} <small>SR</small></span><div className="roster-card-actions">{player.friendshipStatus === "accepted" ? <button disabled={busyId === player.id} onClick={() => act(player.id, "remove")}>REMOVE FRIEND</button> : player.friendshipStatus === "pending" ? player.requestedBy === userId ? <button disabled={busyId === player.id} onClick={() => act(player.id, "remove")}>CANCEL REQUEST</button> : <button disabled={busyId === player.id} onClick={() => act(player.id, "accept")}>ACCEPT REQUEST</button> : (player.acceptsRequests ? <button disabled={busyId === player.id} onClick={() => act(player.id, "request")}><UserPlus size={16}/> ADD FRIEND</button> : <button disabled title="This player only accepts friend requests by friend code">FRIEND CODE NEEDED</button>)}</div></div></article>)}</div> : <div className="roster-empty"><UsersRound size={58} strokeWidth={1.3}/><strong>{query ? "NO PLAYER FOUND" : "THE ARENA IS QUIET"}</strong><p>{query ? "Try another handle." : "Other players will appear here when they join."}</p><button type="button" onClick={copyInvite}><Copy size={18}/>{copied ? "LINK COPIED" : "INVITE A PLAYER"}</button></div>}</section>
    {(friends.length > 0 || outgoing.length > 0) && <section className="roster-section roster-network"><header><UsersRound size={21}/><h2>YOUR NETWORK</h2></header><div>{friends.map(player => <Link href={`/players/${encodeURIComponent(player.id)}`} key={player.id}>{player.handle}<span>FRIEND</span><ArrowRight size={17}/></Link>)}{outgoing.map(player => <Link href={`/players/${encodeURIComponent(player.id)}`} key={player.id}>{player.handle}<span>REQUEST SENT</span><ArrowRight size={17}/></Link>)}</div></section>}
  </div></div></main>;
}
