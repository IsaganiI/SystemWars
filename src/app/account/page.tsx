import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield, UsersRound } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { AvatarSettings } from "@/components/avatar-settings";
import { PlayerAvatar } from "@/components/player-avatar";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";
import { rankName } from "@/lib/rank-tone";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const profile = getPlayerProfile(session.user.id);
  const handle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  const hasAvatar = Boolean(db.prepare("SELECT 1 FROM player_avatar WHERE user_id = ?").get(session.user.id));
  const mode = profile?.preferredMode ?? "1v1";
  const rating = db.prepare("SELECT rating FROM player_rating WHERE user_id = ? AND mode = ?").get(session.user.id, mode) as { rating: number } | undefined;
  const friendCount = (db.prepare("SELECT COUNT(*) AS total FROM friendship WHERE status = 'accepted' AND (user_a = ? OR user_b = ?)").get(session.user.id, session.user.id) as { total: number }).total;

  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play" playerHandle={handle}/>
    <div className="subpage arena-page account-page">
      <div className="account-breadcrumb"><Link href="/play"><ArrowLeft size={16}/> PLAY</Link><span>/</span><strong>PLAYER PROFILE</strong></div>
      <section className="account-fighter" aria-label="Player card">
        <div className="account-fighter-portrait"><PlayerAvatar alt={`${handle}'s avatar`}/></div>
        <div className="account-fighter-copy"><span>PLAYER PROFILE</span><h1>{handle}</h1><div className="account-fighter-rank"><Shield size={23}/><strong>{rankName(rating?.rating)}</strong><i/><b>{(rating?.rating ?? 1000).toLocaleString()} SR</b></div></div>
        <div className="account-fighter-mark" aria-hidden="true">SW</div>
      </section>
      <div className="account-sheet">
        <section className="account-sheet-photo"><header><span>01</span><h2>PLAYER PHOTO</h2></header><AvatarSettings hasAvatar={hasAvatar}/></section>
        <section className="account-sheet-details"><header><span>02</span><h2>ACCOUNT DETAILS</h2></header><dl><div><dt>HANDLE</dt><dd>{handle}</dd></div><div><dt>EMAIL</dt><dd>{session.user.email}</dd></div><div><dt>PREFERRED FORMAT</dt><dd>{profile?.preferredMode ?? "CHOOSE IN SETUP"}</dd></div></dl></section>
      </div>
      <Link href="/players" className="account-friends-link"><UsersRound size={22}/><span><strong>FIND PLAYERS & FRIENDS</strong><small>{friendCount} friends</small></span><ArrowRight size={20}/></Link>
      <div className="account-actions"><Link href={profile ? "/play" : "/onboarding"}>{profile ? "BACK TO PLAY" : "FINISH SETUP"}<ArrowRight size={17}/></Link><SignOutButton/></div>
    </div>
  </div></main>;
}
