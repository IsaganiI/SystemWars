import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { AvatarSettings } from "@/components/avatar-settings";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const profile = getPlayerProfile(session.user.id);
  const handle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  const hasAvatar = Boolean(db.prepare("SELECT 1 FROM player_avatar WHERE user_id = ?").get(session.user.id));
  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play" playerHandle={handle}/><div className="subpage account-page"><Link href="/play" className="match-back"><ArrowLeft size={16}/> BACK TO PLAY</Link><div className="page-head"><div><span className="page-kicker"><Shield size={16}/> PLAYER ACCOUNT</span><h1>{handle.toUpperCase()}</h1></div></div><AvatarSettings hasAvatar={hasAvatar}/><div className="account-grid"><div><span>PLAYER HANDLE</span><strong>{handle}</strong></div><div><span>EMAIL</span><strong>{session.user.email}</strong></div><div><span>RANK</span><strong>UNRANKED</strong></div><div><span>DEFAULT FORMAT</span><strong>{profile?.preferredMode ?? "NOT SET"}</strong></div></div><div className="account-actions"><Link href={profile ? "/play" : "/onboarding"}>{profile ? "GO TO PLAY" : "FINISH SETUP"}</Link><SignOutButton/></div></div></div></main>;
}
