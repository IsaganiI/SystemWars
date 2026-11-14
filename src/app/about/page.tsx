import Link from "next/link";
import { ArrowRight, GitBranch, ShieldCheck, Swords, Workflow } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";

const steps = [
  { number: "01", name: "QUEUE", detail: "Choose 1v1, 2v2, or 3v3 and enter a ranked match." },
  { number: "02", name: "BUILD", detail: "Both sides get the same system design brief and the same building blocks." },
  { number: "03", name: "SIMULATE", detail: "Submitted architectures face the same traffic and failure sequence." },
  { number: "04", name: "COMPARE", detail: "Results show the measured outcome and explain the rating change." },
];

export default function AboutPage() {
  return <main className="game-shell"><GameRail active="about"/><div className="game-main"><GameTopbar active="about"/>
    <div className="subpage about-page">
      <div className="page-head"><div><span className="page-kicker"><Workflow size={16}/> THE GAME / ABOUT</span><h1>ONE BRIEF.<br/><span>TWO DESIGNS.</span></h1><p>SystemWars is a competitive system design game. You build an architecture, run it against a deterministic workload, and see how it performs against another player&apos;s design.</p></div></div>

      <section className="about-principle" aria-labelledby="fairness-title"><div className="about-principle-icon"><ShieldCheck size={30}/></div><div><span className="about-eyebrow">MATCH RULES</span><h2 id="fairness-title">Same test for both sides.</h2><p>Both sides receive the same prompt, components, traffic pattern, and failure sequence. The result should be explainable from the systems they built.</p></div><span className="about-principle-mark">=</span></section>

      <div className="about-grid"><section className="about-flow" aria-labelledby="flow-title"><div className="board-label"><span>THE MATCH FLOW</span><span>01—04</span></div><h2 id="flow-title" className="sr-only">How a match works</h2>{steps.map(step => <div className="about-step" key={step.number}><span>{step.number}</span><strong>{step.name}</strong><p>{step.detail}</p></div>)}</section>
      <section className="about-architecture" aria-labelledby="architecture-title"><div className="board-label"><span>BUILD A REQUEST PATH</span><GitBranch size={16}/></div><h2 id="architecture-title">Build the request path.</h2><p>Place infrastructure components and connect them into a working request path. Architecture decisions change how the system handles load and failures.</p><div className="architecture-path" aria-label="Example path: requests to load balancer to app servers to data store"><span>REQUESTS</span><i/><span>ROUTING</span><i/><span>COMPUTE</span><i/><span>DATA</span></div><div className="about-modes"><span>RANKED FORMATS</span><strong>1v1 <b>·</b> 2v2 <b>·</b> 3v3</strong></div></section></div>

      <div className="about-footer"><div><Swords size={21}/><span>Prototype note: live matchmaking, the editor, simulation, and rating changes are still in development.</span></div><Link href="/" className="about-cta">GO TO PLAY <ArrowRight size={18}/></Link></div>
    </div>
  </div></main>;
}
