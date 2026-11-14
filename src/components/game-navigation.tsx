"use client";

import Link from "next/link";
import { BookOpen, Gamepad2, History, Trophy } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand } from "@/components/brand";

export type GamePage = "play" | "leaderboard" | "matches" | "about";

const items = [
  { page: "play", href: "/play", label: "PLAY", short: "PLAY", icon: Gamepad2 },
  { page: "leaderboard", href: "/leaderboard", label: "LEADERBOARD", short: "RANKS", icon: Trophy },
  { page: "matches", href: "/matches", label: "MATCHES", short: "MATCHES", icon: History },
  { page: "about", href: "/about", label: "ABOUT", short: "ABOUT", icon: BookOpen },
] as const;

export function GameRail({ active }: { active: GamePage }) {
  return <aside className="game-rail" aria-label="Game navigation">
    <Link href="/play" className="rail-logo" aria-label="SystemWars lobby"><span className="brand-mark">SW</span></Link>
    <nav className="rail-nav">{items.map(({ page, href, short, icon: Icon }) =>
      <Link key={page} href={href} title={short} aria-current={active === page ? "page" : undefined} className={`rail-link ${active === page ? "rail-link-active" : ""}`}><Icon size={21}/><span>{short}</span></Link>
    )}</nav>
  </aside>;
}

export function GameTopbar({ active }: { active: GamePage }) {
  const { data: session } = authClient.useSession();
  const handle = session?.user.displayUsername ?? session?.user.username ?? session?.user.name;
  return <>
    <header className="game-topbar">
      <Link href="/play" className="wordmark" aria-label="SystemWars lobby"><Brand/></Link>
      <nav className="game-tabs" aria-label="Main navigation">{items.map(({ page, href, label, icon: Icon }) =>
        <Link key={page} href={href} aria-current={active === page ? "page" : undefined} className={`game-tab ${active === page ? "game-tab-active" : ""}`}><Icon size={17}/>{label}</Link>
      )}</nav>
      <div className="topbar-right">{session ? <Link href="/account" className="topbar-player" aria-label="Your account"><span className="player-avatar">{handle?.slice(0, 1).toUpperCase()}</span><span>{handle?.toUpperCase()}<small>UNRANKED</small></span></Link> : <Link href="/login" className="topbar-player" aria-label="Sign in"><span className="player-avatar">?</span><span>SIGN IN<small>PLAYER ACCOUNT</small></span></Link>}</div>
    </header>
    <nav className="game-mobile-tabs" aria-label="Mobile game navigation">{items.map(({ page, href, short, icon: Icon }) =>
      <Link key={page} href={href} aria-current={active === page ? "page" : undefined} className={`game-mobile-tab ${active === page ? "game-mobile-tab-active" : ""}`}><Icon size={16}/><span>{short}</span></Link>
    )}</nav>
  </>;
}
