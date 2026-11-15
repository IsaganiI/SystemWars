import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UsersRound } from "lucide-react";
import { FriendActionButton } from "@/components/friend-action-button";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { RankEmblem } from "@/components/rank-emblem";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankName } from "@/lib/rank-tone";
import { requestPolicy } from "@/lib/friends";

type Player = { id: string; handle: string; preferred_mode: string };
type Rating = { mode: string; rating: number; wins: number; losses: number };

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;
  if (id === session.user.id) redirect("/account");
  const player = db.prepare(`SELECT u.id, COALESCE(u."displayUsername", u.username, u.name) AS handle,
    p.preferred_mode FROM user u JOIN player_profile p ON p.user_id = u.id WHERE u.id = ?`).get(id) as Player | undefined;
  if (!player) notFound();
  const ratings = db.prepare("SELECT mode, rating, wins, losses FROM player_rating WHERE user_id = ? ORDER BY mode").all(id) as Rating[];
  const primary = ratings.find(row => row.mode === player.preferred_mode);
  const pair = [session.user.id, id].sort();
  const friendship = db.prepare("SELECT status, requested_by FROM friendship WHERE user_a = ? AND user_b = ?").get(pair[0], pair[1]) as { status: "pending" | "accepted"; requested_by: string } | undefined;
  return <main className="game-shell"><GameRail active="players"/><div className="game-main"><GameTopbar active="players"/>
    <div className="subpage arena-page account-page player-profile-page">
      <div className="account-breadcrumb"><Link href="/players"><ArrowLeft size={16}/> PLAYERS</Link><span>/</span><strong>PLAYER PROFILE</strong></div>
      <section className="account-fighter" aria-label={`${player.handle} profile`}><div className="account-fighter-portrait player-profile-initial">{player.handle[0]?.toUpperCase()}</div><div className="account-fighter-copy"><span>PLAYER PROFILE</span><h1>{player.handle}</h1><div className="account-fighter-rank"><RankEmblem rating={primary?.rating} size={30}/><strong>{rankName(primary?.rating)}</strong><i/><b>{(primary?.rating ?? 1000).toLocaleString()} SR</b></div></div><div className="account-fighter-mark" aria-hidden="true">SW</div></section>
      <div className="player-profile-actions"><FriendActionButton targetId={id} initialStatus={friendship?.status ?? null} requestedBy={friendship?.requested_by ?? null} userId={session.user.id} acceptsRequests={requestPolicy(id) === "anyone"}/></div>
      <section className="player-section"><h2><UsersRound size={22}/> RANKED RECORD</h2><div className="player-rating-grid">{(["1v1", "2v2", "3v3"] as const).map(mode => { const row = ratings.find(item => item.mode === mode); return <div className="player-rating-card" key={mode}><span>{mode.toUpperCase()}</span><div className="player-rating-title"><RankEmblem rating={row?.rating} size={44}/><strong>{rankName(row?.rating)}</strong></div><b>{(row?.rating ?? 1000).toLocaleString()} SR</b><small>{row?.wins ?? 0} WINS · {row?.losses ?? 0} LOSSES</small></div>; })}</div></section>
    </div>
  </div></main>;
}
