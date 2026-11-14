import Link from "next/link";
import { ArrowRight, Database, Layers3, Network, Server, ShieldQuestion } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";

const rounds = [
  { number: "01", title: "Queue", detail: "Choose 1v1, 2v2, or 3v3." },
  { number: "02", title: "Build", detail: "You have five minutes to design a system." },
  { number: "03", title: "Stress test", detail: "Both designs face the same traffic and failures." },
  { number: "04", title: "Result", detail: "Compare what stayed online and what broke." },
];

export default function AboutPage() {
  return <main className="game-shell"><GameRail active="about"/><div className="game-main"><GameTopbar active="about"/>
    <div className="game-guide">
      <section className="game-guide-hero">
        <div className="game-guide-intro"><span>THE GAME</span><h1>The system is<br/><em>the battleground.</em></h1><p>Same brief. Same traffic. Your architecture against theirs.</p><Link href="/play">GO TO PLAY <ArrowRight size={18}/></Link></div>
        <div className="game-guide-arena" aria-label="Illustration of a match with a shared challenge and hidden opponent design">
          <div className="guide-arena-score"><span><b className="guide-team-mark guide-team-you">1</b> YOU</span><strong>05:00 <small>BUILD</small></strong><span>PLAYER 2 <b className="guide-team-mark guide-team-rival">2</b></span></div>
          <div className="guide-arena-brief"><span>SHARED BRIEF</span><strong>Ticket onsale</strong><small>A surge of buyers. Keep checkout moving.</small></div>
          <div className="guide-arena-duel"><div className="guide-arena-side"><span>YOUR DESIGN</span><div className="guide-arena-path"><Network size={23}/><i/><Layers3 size={23}/><i/><Server size={23}/><i/><Database size={23}/></div><small>Client → balancer → app → database</small></div><div className="guide-arena-vs">VS</div><div className="guide-arena-side guide-arena-hidden"><span>OPPONENT DESIGN</span><div className="guide-hidden-tiles"><i/><i/><i/><i/></div><small><ShieldQuestion size={14}/> Hidden until the result</small></div></div>
          <div className="guide-arena-wave"><span>TRAFFIC TEST</span><div aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 60}ms` }}/>)}</div></div>
        </div>
      </section>
      <section className="game-guide-rounds" aria-labelledby="guide-rounds-title"><div className="game-guide-rounds-head"><h2 id="guide-rounds-title">How the match plays out</h2><span>01 / 04</span></div><div className="game-guide-round-grid">{rounds.map(round => <div className="game-guide-round" key={round.number}><span>{round.number}</span><h3>{round.title}</h3><p>{round.detail}</p></div>)}</div></section>
    </div>
  </div></main>;
}
