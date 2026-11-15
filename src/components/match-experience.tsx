"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Radio, Timer, UsersRound, RadioTower } from "lucide-react";
import { LandingDemo, type LiveMatch } from "@/components/landing-demo";
import { useMatchAudioScene } from "@/components/site-music";
import type { MatchBrief } from "@/lib/match-scenarios";

type BriefState = { ownReady: boolean; ready: number; total: number; allReady: boolean; serverNow?: number; buildEndsAt?: number | null };

export function MatchExperience({ match, brief, initialState }: { match: LiveMatch; brief: MatchBrief; initialState: BriefState }) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useMatchAudioScene(state.allReady ? "game" : "brief");

  useEffect(() => {
    if (state.allReady) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/brief`, { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as BriefState;
        if (active) { setState(next); setError(""); }
      } catch { if (active) setError("Connection interrupted. Reconnecting…"); }
    }, 1200);
    return () => { active = false; window.clearInterval(timer); };
  }, [match.id, state.allReady]);

  async function confirmReady() {
    if (busy || state.ownReady) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/brief`, { method: "POST" });
      const next = await response.json();
      if (!response.ok) { setError(next.error ?? "Could not mark you ready."); return; }
      setState(next as BriefState);
    } catch { setError("Could not mark you ready. Try again."); }
    finally { setBusy(false); }
  }

  // The build clock starts when the last player confirms, so take the deadline from the newest brief response.
  if (state.allReady) return <div className="match-build-enter"><LandingDemo match={state.buildEndsAt ? { ...match, buildEndsAt: state.buildEndsAt, serverNow: state.serverNow ?? match.serverNow } : match} brief={brief}/></div>;
  return <section className="match-briefing" aria-label="Match scenario briefing">
    <div className="match-briefing-glow" aria-hidden="true"/>
    <div className="match-briefing-top"><span>{match.isNpc ? "AI CHALLENGE" : "MATCH BRIEF"}</span><strong>{match.mode.toUpperCase()}</strong></div>
    <div className="match-briefing-main"><header className="match-briefing-intro"><h1>{brief.name}</h1><p>{brief.situation}</p></header><dl className="match-briefing-facts"><div><UsersRound aria-hidden="true"/><dt>Scale</dt><dd>{brief.scale}</dd></div><div><RadioTower aria-hidden="true"/><dt>Traffic</dt><dd>{brief.throughput}</dd></div><div><Timer aria-hidden="true"/><dt>Speed</dt><dd>{brief.latency}</dd></div></dl></div>
    <div className="match-briefing-requirements"><h2>REQUIREMENTS</h2><ul>{brief.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></div>
    <footer className="match-briefing-footer"><div className="match-briefing-ready"><Radio size={19}/><span>{state.ownReady ? "Waiting for the other side" : "Read the brief, then confirm"}<small>{state.ready} of {state.total} players ready</small></span></div><button type="button" disabled={busy || state.ownReady} onClick={confirmReady}>{state.ownReady ? <><Check size={22}/> READY</> : <>CONFIRM BRIEF <ArrowRight size={23}/></>}</button></footer>
    {error && <p className="match-briefing-error" role="alert">{error}</p>}
  </section>;
}
