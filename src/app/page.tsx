"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, Bell, BookOpen, ChevronRight,
  Gamepad2, Layers3, Network, Play, Plus, ShieldCheck, Swords, Target,
  Trophy, UserRound, UsersRound, X, Zap,
} from "lucide-react";

type Mode = "1v1" | "2v2" | "3v3";

const modes: { label: Mode; icon: typeof UserRound }[] = [
  { label: "1v1", icon: UserRound },
  { label: "2v2", icon: UsersRound },
  { label: "3v3", icon: Swords },
];

const matches = [
  { result: "W", opponent: "cachemiss", challenge: "Ticket onsale", when: "12m ago", change: "+31 SR" },
  { result: "L", opponent: "nodezero", challenge: "Design a CDN", when: "1h ago", change: "−18 SR" },
  { result: "W", opponent: "graphlord", challenge: "Live chat", when: "3h ago", change: "+26 SR" },
];

export default function LobbyPage() {
  const [mode, setMode] = useState<Mode>("1v1");
  const [queuePreview, setQueuePreview] = useState(false);
  const partySize = Number(mode[0]);

  return (
    <main className="flex min-h-screen bg-ink text-sand">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line bg-[#111722] lg:flex" aria-label="Game navigation">
        <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-line px-7" aria-label="SystemWars lobby">
          <span className="flex items-end gap-[3px]" aria-hidden="true"><i className="h-5 w-[7px] skew-x-[-28deg] bg-signal" /><i className="h-7 w-[7px] skew-x-[-28deg] bg-signal" /></span>
          <span className="text-xl font-extrabold tracking-[-.05em]">System<span className="text-signal">Wars</span></span>
        </Link>
        <nav className="space-y-1 px-4 pt-8 text-sm font-semibold">
          <Link href="/" aria-current="page" className="flex items-center gap-4 rounded-lg border-l-[3px] border-signal bg-signal/15 px-4 py-3.5 text-white"><Gamepad2 size={20} className="text-signal" />Play</Link>
          <span className="flex cursor-not-allowed items-center justify-between rounded-lg px-4 py-3.5 text-muted/75"><span className="flex items-center gap-4"><Trophy size={20} />Leaderboard</span><small className="text-[10px]">SOON</small></span>
          <Link href="/about" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-muted hover:bg-white/5 hover:text-white"><BookOpen size={20} />Learn</Link>
          <a href="#practice" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-muted hover:bg-white/5 hover:text-white"><Layers3 size={20} />Challenges</a>
          <a href="#rank" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-muted hover:bg-white/5 hover:text-white"><UserRound size={20} />Profile</a>
        </nav>
        <div className="mt-auto border-t border-line px-7 py-5 text-[11px] text-muted">Season 00 <span className="mx-2">·</span> UI preview</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-line bg-[#131925] px-5 sm:px-9">
          <div className="flex items-center gap-4"><Link href="/" className="text-lg font-extrabold tracking-[-.05em] lg:hidden">System<span className="text-signal">Wars</span></Link><span className="hidden h-5 w-px bg-line sm:block lg:hidden" /><h1 className="text-xl font-bold">Lobby</h1></div>
          <div className="flex items-center gap-5"><span className="hidden rounded-full border border-line px-3 py-1.5 text-[10px] font-bold tracking-[.12em] text-muted sm:block">DESIGN PREVIEW</span><Bell size={19} className="text-muted" aria-label="No notifications" /><span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel2 text-sm font-bold">A</span></div>
        </header>

        <nav aria-label="Mobile game navigation" className="flex gap-1 overflow-x-auto border-b border-line bg-[#131925] px-4 py-2 lg:hidden"><Link href="/" className="rounded-md bg-signal/15 px-3 py-2 text-xs font-bold text-signal">Play</Link><Link href="/about" className="rounded-md px-3 py-2 text-xs text-muted">Learn</Link><a href="#practice" className="rounded-md px-3 py-2 text-xs text-muted">Challenges</a><a href="#rank" className="rounded-md px-3 py-2 text-xs text-muted">Profile</a></nav>

        <div className="mx-auto grid max-w-[1450px] gap-7 px-5 py-7 sm:px-9 sm:py-9 xl:grid-cols-[minmax(0,1.38fr)_minmax(350px,.95fr)]">
          <div className="min-w-0 space-y-7">
            <section id="rank" className="panel grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_210px] sm:p-7" aria-labelledby="rank-title">
              <div className="flex items-center gap-6">
                <div className="relative grid h-[102px] w-[102px] shrink-0 place-items-center rounded-2xl border border-[#5c6c95] bg-[linear-gradient(145deg,#293752,#141b2b)] shadow-[inset_0_0_24px_#8aa0ee22]" aria-label="Rank emblem placeholder"><span className="text-4xl font-light text-[#b4c3f1]">◇</span><span className="absolute bottom-2 text-[10px] font-bold tracking-[.2em] text-muted">II</span></div>
                <div><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Competitive rank</span><h2 id="rank-title" className="mt-2 text-[27px] font-extrabold tracking-[-.04em]">Diamond II</h2><div className="mt-1 flex items-center gap-3 text-sm"><span className="text-muted">1,640 SR</span><span className="font-bold text-[#99c6a5]">▲ +31</span></div><div className="mt-4 h-[6px] w-36 overflow-hidden rounded-full bg-[#313a50]"><div className="h-full w-[65%] rounded-full bg-signal" /></div></div>
              </div>
              <dl className="space-y-3 border-t border-line pt-4 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"><div className="flex justify-between"><dt className="text-muted">Win rate</dt><dd className="font-bold">62%</dd></div><div className="flex justify-between border-t border-line pt-3"><dt className="text-muted">Record</dt><dd className="font-bold">18W – 11L</dd></div><div className="flex justify-between border-t border-line pt-3"><dt className="text-muted">Global rank</dt><dd className="font-bold">#2,381</dd></div><p className="pt-1 text-[10px] text-muted">Sample player data</p></dl>
            </section>

            <section aria-label="Matchmaking controls">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(160px,1.5fr)]">
                {modes.map(item => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => { setMode(item.label); setQueuePreview(false); }} aria-pressed={mode === item.label} className={`flex min-h-[70px] items-center justify-center gap-3 rounded-xl border text-lg font-extrabold transition-colors motion-safe:active:scale-[.98] ${mode === item.label ? "border-signal bg-signal/15 text-white shadow-[inset_0_0_0_1px_#8298ef55]" : "border-line bg-panel text-muted hover:border-[#657397] hover:text-white"}`}><Icon size={22} className={mode === item.label ? "text-signal" : ""} />{item.label}</button>; })}
                <button type="button" onClick={() => setQueuePreview(value => !value)} className={`find-button col-span-3 min-h-[70px] gap-3 text-base sm:col-span-1 ${queuePreview ? "flex items-center rounded-lg border border-line bg-panel px-5 font-bold text-sand hover:border-signal/60" : "primary-button shadow-[0_8px_28px_#8298ef24]"}`}>{queuePreview ? <X size={19} /> : <Play size={19} fill="currentColor" />}{queuePreview ? "Cancel preview" : "Find Match"}</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3"><div className="flex items-center gap-4"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Your party</span><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-md border border-signal/60 bg-signal/10 text-xs font-bold text-signal" aria-label="Your slot">A</span>{Array.from({ length: partySize - 1 }, (_, index) => <span key={index} className="grid h-9 w-9 place-items-center rounded-md border border-dashed border-line text-muted" aria-label={`Open teammate slot ${index + 1}`}><Plus size={15} /></span>)}</div></div><span className="text-xs text-muted">{partySize === 1 ? "Solo party" : `${partySize - 1} open teammate ${partySize === 2 ? "slot" : "slots"}`}</span></div>
              {queuePreview ? <div role="status" aria-live="polite" className="mt-3 flex items-center gap-3 rounded-lg border border-signal/40 bg-signal/10 px-4 py-3 text-xs"><span className="h-2 w-2 rounded-full bg-signal motion-safe:animate-pulse" /><span><strong>{mode} queue preview active.</strong> Matchmaking is not connected yet.</span></div> : <p className="mt-3 text-[11px] text-muted">Select a format, then preview its queue state.</p>}
            </section>

            <section id="practice" className="panel p-6 sm:p-7" aria-labelledby="practice-title"><div className="flex items-center justify-between border-b border-line pb-4"><h2 id="practice-title" className="text-lg font-extrabold">Practice challenge</h2><Link href="/match" className="flex items-center gap-1 text-xs text-muted hover:text-white">View challenge <ArrowRight size={15} /></Link></div><div className="flex flex-wrap items-center justify-between gap-5 py-5"><div><span className="rounded-md bg-[#354c76] px-2.5 py-1 text-[10px] font-bold text-[#bfd0ff]">MEDIUM</span><h3 className="mt-3 text-xl font-bold">Design a ticketing platform</h3><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Keep ticket checkout responsive and seat inventory consistent during a major onsale.</p></div><Link href="/match" className="flex items-center gap-2 rounded-lg border border-[#7c879e] px-4 py-2.5 text-sm font-bold hover:border-signal hover:text-signal"><Play size={15} fill="currentColor" />Practice</Link></div><div className="grid grid-cols-2 gap-4 border-t border-line pt-5 text-xs sm:grid-cols-3"><div className="flex items-center gap-3"><UsersRound size={21} className="text-muted" /><span><strong className="block">100,000</strong><small className="text-muted">concurrent users</small></span></div><div className="flex items-center gap-3"><Zap size={21} className="text-muted" /><span><strong className="block">P95 &lt; 250 ms</strong><small className="text-muted">latency target</small></span></div><div className="flex items-center gap-3"><ShieldCheck size={21} className="text-muted" /><span><strong className="block">No oversells</strong><small className="text-muted">inventory integrity</small></span></div></div></section>
          </div>

          <div className="min-w-0 space-y-7">
            <section className="panel p-6 sm:p-7" aria-labelledby="matches-title"><div className="flex items-center justify-between border-b border-line pb-4"><h2 id="matches-title" className="text-lg font-extrabold">Recent matches</h2><Link href="/results" className="flex items-center gap-1 text-xs text-muted hover:text-white">View result <ArrowRight size={15} /></Link></div><div>{matches.map(match => <Link href="/results" key={match.opponent} className="grid grid-cols-[35px_minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-4 last:border-0 hover:bg-white/[.025]"><span className={`grid h-8 w-8 place-items-center rounded-md text-sm font-extrabold ${match.result === "W" ? "bg-[#253f42] text-[#9ed5c4]" : "bg-[#40313c] text-[#e2a5b8]"}`}>{match.result}</span><span className="min-w-0"><strong className="block truncate text-sm">vs. {match.opponent}</strong><small className="block truncate text-muted">{match.challenge}</small></span><span className="text-right"><small className="block text-[11px] text-muted">{match.when}</small><strong className={`mt-1 block text-xs ${match.result === "W" ? "text-[#9ed5c4]" : "text-[#e2a5b8]"}`}>{match.change}</strong></span></Link>)}</div><p className="mt-2 text-[10px] text-muted">Sample match history for the design preview.</p></section>

            <section className="panel p-6 sm:p-7" aria-labelledby="activity-title"><div className="flex items-center gap-3 border-b border-line pb-4"><Activity size={19} className="text-muted" /><h2 id="activity-title" className="text-lg font-extrabold">Activity</h2></div><div className="space-y-0 text-sm"><div className="flex items-center gap-4 border-b border-line py-4"><Trophy size={19} className="shrink-0 text-muted" /><span className="flex-1">Reached Diamond II</span><small className="text-muted">1d ago</small></div><div className="flex items-center gap-4 border-b border-line py-4"><Target size={19} className="shrink-0 text-muted" /><span className="flex-1">Won 3 matches in a row</span><small className="text-muted">2d ago</small></div><div className="flex items-center gap-4 py-4"><Network size={19} className="shrink-0 text-muted" /><span className="flex-1">Completed “Design a CDN”</span><small className="text-muted">2d ago</small></div></div><p className="mt-1 text-[10px] text-muted">Sample activity for the design preview.</p></section>
            <Link href="/about" className="flex items-center justify-between rounded-xl border border-line bg-panel px-5 py-4 text-sm text-muted hover:border-signal/50 hover:text-white"><span>How SystemWars works</span><ChevronRight size={17} /></Link>
          </div>
        </div>
      </div>
    </main>
  );
}
