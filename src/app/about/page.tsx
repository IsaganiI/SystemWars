import Link from "next/link";
import { ArrowRight, GitBranch, ShieldCheck, Swords, Workflow } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";

const steps = [
  { number: "01", name: "QUEUE", detail: "Pick 1v1, 2v2, or 3v3." },
  { number: "02", name: "BUILD", detail: "Place and connect infrastructure on the canvas." },
  { number: "03", name: "TEST", detail: "Both designs run through the same load and failures." },
  { number: "04", name: "RESULT", detail: "Compare throughput, latency, and availability." },
];

export default function AboutPage() {
  return <main className="game-shell"><GameRail active="about"/><div className="game-main"><GameTopbar active="about"/>
    <div className="subpage about-page">
      <div className="page-head"><div><span className="page-kicker"><Workflow size={16}/> SYSTEMWARS / GAME RULES</span><h1>HOW A MATCH<br/><span>WORKS.</span></h1><p>Build a system. Run it against the same test as your opponent. Compare the results.</p></div></div>

      <section className="about-principle" aria-labelledby="fairness-title"><div className="about-principle-icon"><ShieldCheck size={30}/></div><div><span className="about-eyebrow">FAIR PLAY</span><h2 id="fairness-title">Same test for both sides.</h2><div className="about-rules"><span>BRIEF</span><span>COMPONENTS</span><span>TRAFFIC</span><span>FAILURES</span></div></div></section>

      <div className="about-grid"><section className="about-flow" aria-labelledby="flow-title"><div className="board-label"><span>THE MATCH</span><span>01—04</span></div><h2 id="flow-title" className="sr-only">Match phases</h2>{steps.map(step => <div className="about-step" key={step.number}><span>{step.number}</span><strong>{step.name}</strong><p>{step.detail}</p></div>)}</section>
      <section className="about-architecture" aria-labelledby="architecture-title"><div className="board-label"><span>THE CANVAS</span><GitBranch size={16}/></div><h2 id="architecture-title">Architecture editor</h2><p>Place services, connect them, then test the request path.</p><div className="architecture-path" aria-label="Example path: requests to load balancer to app service to database"><span>REQUESTS</span><i/><span>BALANCER</span><i/><span>APP</span><i/><span>DATABASE</span></div><div className="about-modes"><span>RANKED FORMATS</span><strong>1v1 <b>·</b> 2v2 <b>·</b> 3v3</strong></div></section></div>

      <div className="about-footer"><div><Swords size={21}/><span>Matchmaking, editing, simulation, and ratings are in development.</span></div><Link href="/" className="about-cta">GO TO PLAY <ArrowRight size={18}/></Link></div>
    </div>
  </div></main>;
}
