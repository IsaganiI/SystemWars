import Link from "next/link";
import { ArrowRight, Database, Layers3, Network, Server } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";

const phases = [
  { number: "01", title: "Queue", detail: "Pick 1v1, 2v2, or 3v3. Both sides get the same challenge." },
  { number: "02", title: "Build", detail: "Place services and connect the request path before time runs out." },
  { number: "03", title: "Test", detail: "Your designs face the same traffic and failure events." },
  { number: "04", title: "Compare", detail: "See what held up, what failed, and where the designs differ." },
];

export default function AboutPage() {
  return <main className="game-shell"><GameRail active="about"/><div className="game-main"><GameTopbar active="about"/>
    <div className="about-manual">
      <div className="about-manual-head">
        <div><span className="about-manual-label">SYSTEMWARS / FIELD GUIDE</span><h1>Build it.<br/><span>Prove it.</span></h1></div>
        <p>Two sides. One system design problem. The better architecture wins.</p>
      </div>

      <div className="about-manual-grid">
        <section className="about-manual-phases" aria-labelledby="about-match-title">
          <div className="about-manual-section-head"><h2 id="about-match-title">A match, start to finish</h2><span>01 — 04</span></div>
          {phases.map(phase => <div className="about-manual-phase" key={phase.number}><span>{phase.number}</span><div><h3>{phase.title}</h3><p>{phase.detail}</p></div><ArrowRight size={19} aria-hidden="true"/></div>)}
        </section>

        <section className="about-manual-build" aria-labelledby="about-build-title">
          <div className="about-manual-section-head"><h2 id="about-build-title">On the canvas</h2><span>EXAMPLE PATH</span></div>
          <div className="about-manual-diagram" aria-label="A request goes through a load balancer and app server to a database">
            <div className="about-manual-node"><Network size={25}/><strong>Request</strong></div><i/>
            <div className="about-manual-node"><Layers3 size={25}/><strong>Balancer</strong></div><i/>
            <div className="about-manual-node"><Server size={25}/><strong>App</strong></div><i/>
            <div className="about-manual-node"><Database size={25}/><strong>Database</strong></div>
          </div>
          <div className="about-manual-note"><span>One brief</span><span>Two builds</span><span>Same test</span></div>
        </section>
      </div>
      <div className="about-manual-end"><span>READY TO BUILD?</span><Link href="/register">CREATE ACCOUNT <ArrowRight size={17}/></Link></div>
    </div>
  </div></main>;
}
