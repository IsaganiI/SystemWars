"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Check, Swords, X } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import { vetoScenarios, type VetoScenario } from "@/lib/veto-scenarios";

type VetoState = {
  isNpc: boolean;
  turnTeam: number;
  firstTeam: number;
  yourTeam: number;
  firstBan: VetoScenario | null;
  secondBan: VetoScenario | null;
  selectedScenario: VetoScenario | null;
  scenarios: typeof vetoScenarios;
};

const descriptions: Record<VetoScenario, string> = {
  "ticket-onsale": "Build for the rush when tickets go live.",
  "live-chat": "Keep the conversation moving at scale.",
  "video-streaming": "Deliver smooth video to a massive audience.",
};

export function VetoScreen({ matchId, handle, rival, initialState }: { matchId: string; handle: string; rival: string; initialState: VetoState }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const complete = Boolean(state.selectedScenario);
  const yourTurn = state.turnTeam === state.yourTeam && !complete;
  const activePlayer = state.turnTeam === state.yourTeam ? handle : rival;
  const chosen = vetoScenarios.find(item => item.id === state.selectedScenario);
  const step = complete ? 3 : state.firstBan ? 2 : 1;

  useEffect(() => {
    if (state.selectedScenario) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/veto`, { cache: "no-store" });
        if (active && response.ok) { setState(await response.json()); setError(""); }
      } catch { if (active) setError("Connection lost. Reconnecting…"); }
    }, 1200);
    return () => { active = false; window.clearInterval(timer); };
  }, [matchId, state.selectedScenario]);

  async function ban(scenario: VetoScenario) {
    if (!yourTurn || working) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/veto`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario }),
      });
      const body = await response.json();
      if (response.ok) setState(body);
      else setError(body.error ?? "Could not ban that stage.");
    } catch { setError("Could not submit your ban. Try again."); }
    finally { setWorking(false); }
  }

  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play" playerHandle={handle}/>
    <div className="veto-screen">
      <div className="veto-beams" aria-hidden="true"/>
      <div className="veto-content">
        <header className="veto-head">
          <div><h1><span>STAGE</span><em>VETO</em></h1></div>
          <div className={`veto-turn ${yourTurn ? "veto-turn-yours" : ""} ${complete ? "veto-turn-complete" : ""}`} role="status"><span className="veto-turn-icon">{complete ? <Check size={26}/> : <Swords size={27}/>}</span><span className="veto-turn-copy"><small>{complete ? "READY TO BATTLE" : yourTurn ? "MAKE YOUR MOVE" : "STAND BY"}</small><strong>{complete ? `${chosen?.name} selected` : yourTurn ? "Your ban" : `${activePlayer} is banning`}</strong></span><span className="veto-rounds" aria-label={`Veto phase ${step} of 3`}><span className={`veto-round ${step === 1 ? "current" : step > 1 ? "passed" : ""}`} title="First ban">01<small>BAN</small></span><span className={`veto-round ${step === 2 ? "current" : step > 2 ? "passed" : ""}`} title="Second ban">02<small>BAN</small></span><span className={`veto-round ${step === 3 ? "current" : ""}`} title="Final stage">03<small>STAGE</small></span></span></div>
        </header>
        <div className="veto-matchup" aria-label="Players"><div className={`veto-fighter ${yourTurn ? "veto-fighter-active" : ""}`}><span className="veto-fighter-number">P1</span><span className="veto-fighter-name"><small>YOUR SIDE</small><strong>{handle}</strong></span></div><div className="veto-versus">VS</div><div className={`veto-fighter veto-fighter-rival ${!yourTurn && !complete ? "veto-fighter-active" : ""}`}><span className="veto-fighter-number">P2</span><span className="veto-fighter-name"><small>{state.isNpc ? "AI CHALLENGER" : "OPPOSING SIDE"}</small><strong>{rival}</strong></span></div></div>
        <section className="veto-cards" aria-label="Challenges to veto">{vetoScenarios.map((scenario, index) => {
          const banNumber = state.firstBan === scenario.id ? 1 : state.secondBan === scenario.id ? 2 : null;
          const winner = state.selectedScenario === scenario.id;
          return <button key={scenario.id} type="button" className={`veto-card veto-card-${index + 1} ${banNumber ? "veto-card-banned" : ""} ${winner ? "veto-card-selected" : ""}`} disabled={!yourTurn || working || Boolean(banNumber) || complete} onClick={() => ban(scenario.id)} aria-label={`${scenario.name}. ${banNumber ? `Banned in round ${banNumber}` : winner ? "Selected final stage" : yourTurn ? "Ban this stage" : "Available stage"}`}>
            <span className="veto-card-top"><span>STAGE 0{index + 1}</span><span className="veto-card-diamond">◆</span></span>
            <span className="veto-card-art" aria-hidden="true"/>
            {banNumber && <span className="veto-ban-stamp" aria-hidden="true"><X size={48} strokeWidth={3}/><strong>BANNED</strong><small>ROUND 0{banNumber}</small></span>}
            {winner && <span className="veto-selected-stamp" aria-hidden="true"><Swords size={22}/> FINAL STAGE</span>}
            <span className="veto-card-info"><strong>{scenario.name}</strong><small>{descriptions[scenario.id]}</small></span>
            <span className="veto-card-action"><span>{banNumber ? `BANNED · ROUND 0${banNumber}` : winner ? "BATTLEFIELD LOCKED" : yourTurn ? "BAN THIS STAGE" : "AVAILABLE"}</span><span className="veto-card-action-mark">{banNumber ? <X size={24}/> : winner ? <Check size={24}/> : yourTurn ? <Ban size={23}/> : <ArrowRight size={23}/>}</span></span>
          </button>;
        })}</section>
        {complete && <div className="veto-footer"><button type="button" className="veto-enter" onClick={() => router.push(`/match?id=${encodeURIComponent(matchId)}`)}>ENTER THE ARENA <ArrowRight size={22}/></button></div>}
        {error && <p className="veto-error" role="alert">{error}</p>}
      </div>
    </div>
  </div></main>;
}
