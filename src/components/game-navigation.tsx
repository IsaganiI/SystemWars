"use client";

import Link from "next/link";
import { Gamepad2, History, LogIn, Settings2, Trophy, UsersRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand, BrandIcon } from "@/components/brand";

export type GamePage = "play" | "leaderboard" | "matches" | "players";

const items = [
  { page: "play", href: "/play", label: "PLAY", short: "PLAY", icon: Gamepad2 },
  { page: "leaderboard", href: "/leaderboard", label: "LEADERBOARD", short: "RANKS", icon: Trophy },
  { page: "matches", href: "/matches", label: "MATCHES", short: "MATCHES", icon: History },
  { page: "players", href: "/players", label: "PLAYERS", short: "PLAYERS", icon: UsersRound },
] as const;

export function GameRail({ active }: { active: GamePage }) {
  return <aside className="game-rail" aria-label="Game navigation">
    <Link href="/play" className="rail-logo" aria-label="SystemWars lobby"><BrandIcon/></Link>
    <nav className="rail-nav">{items.map(({ page, href, short, icon: Icon }) =>
      <Link key={page} href={href} title={short} aria-current={active === page ? "page" : undefined} className={`rail-link ${active === page ? "rail-link-active" : ""}`}><Icon size={21}/><span>{short}</span></Link>
    )}</nav>
  </aside>;
}

export function GameTopbar({ active, playerHandle }: { active: GamePage; playerHandle?: string }) {
  const { data: session } = authClient.useSession();
  return <>
    <header className="game-topbar">
      <Link href="/play" className="wordmark" aria-label="SystemWars lobby"><Brand/></Link>
      <nav className="game-tabs" aria-label="Main navigation">{items.map(({ page, href, label, icon: Icon }) =>
        <Link key={page} href={href} aria-current={active === page ? "page" : undefined} className={`game-tab ${active === page ? "game-tab-active" : ""}`}><Icon size={18} strokeWidth={2.2}/><span>{label}</span></Link>
      )}</nav>
      <div className="topbar-right">{playerHandle || session ? <Link href="/account" className="topbar-settings" aria-label="Account settings" title="Account settings"><Settings2 size={24} strokeWidth={1.8}/><span>ACCOUNT</span></Link> : <Link href="/login" className="topbar-settings" aria-label="Sign in" title="Sign in"><LogIn size={23} strokeWidth={1.8}/><span>SIGN IN</span></Link>}</div>
    </header>
    <nav className="game-mobile-tabs" aria-label="Mobile game navigation">{items.map(({ page, href, short, icon: Icon }) =>
      <Link key={page} href={href} aria-current={active === page ? "page" : undefined} className={`game-mobile-tab ${active === page ? "game-mobile-tab-active" : ""}`}><Icon size={17} strokeWidth={2.2}/><span>{short}</span></Link>
    )}</nav>
  </>;
}
