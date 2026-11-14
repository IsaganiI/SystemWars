"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, Layers3, Network, Server } from "lucide-react";

const phases = [
  { label: "Queue", title: "Pick a format.", detail: "1v1, 2v2, or 3v3. Everyone gets the same challenge." },
  { label: "Build", title: "Draw the path.", detail: "Place components and connect services. The other side's design stays hidden." },
  { label: "Test", title: "Take the hit.", detail: "Both designs face the same traffic spike and incident sequence." },
  { label: "Result", title: "Read the numbers.", detail: "Compare latency, availability, and throughput side by side." },
];

function PhaseScene({ phase }: { phase: number }) {
  if (phase === 0) return <div className="manual-scene-queue"><div className="manual-formats"><span>1v1</span><span>2v2</span><span>3v3</span></div><div className="manual-versus"><div><span>YOU</span><strong>01</strong></div><b>VS</b><div><span>OPPONENT</span><strong>02</strong></div></div><div className="manual-shared"><span>SHARED CHALLENGE</span><strong>Ticket onsale</strong></div></div>;
  if (phase === 1) return <div className="manual-scene-build"><div className="manual-canvas-label">YOUR CANVAS <span>05:00</span></div><div className="manual-path"><div><Network size={28}/><strong>CLIENT</strong></div><i/><div><Layers3 size={28}/><strong>BALANCER</strong></div><i/><div><Server size={28}/><strong>APP</strong></div><i/><div><Database size={28}/><strong>DATABASE</strong></div></div><div className="manual-hidden">OPPONENT CANVAS <span>HIDDEN</span></div></div>;
  if (phase === 2) return <div className="manual-scene-test"><div className="manual-test-label"><span>TRAFFIC SPIKE</span><strong>RUNNING</strong></div><div className="manual-test-wave" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 45}ms` }}/>)}</div><div className="manual-test-lanes"><div><span>YOUR BUILD</span><i/><strong>→</strong></div><div><span>OTHER BUILD</span><i/><strong>→</strong></div></div><span className="manual-incident">INCIDENT INCOMING</span></div>;
  return <div className="manual-scene-result"><div className="manual-result-head"><span>FINAL COMPARISON</span><span>YOU / OPPONENT</span></div>{["LATENCY", "AVAILABILITY", "THROUGHPUT"].map(metric => <div className="manual-result-row" key={metric}><span>{metric}</span><div><i/><i/></div></div>)}<div className="manual-result-foot">SAME TEST. TWO DIFFERENT BUILDS.</div></div>;
}

export function GameGuide() {
  const [active, setActive] = useState(0);
  const phase = phases[active];
  return <section className="manual-page" aria-label="How to play SystemWars">
    <header className="manual-page-head"><div><span>THE GAME / 01—04</span><h1>How to play</h1></div><Link href="/play">OPEN PLAY <ArrowRight size={17}/></Link></header>
    <div className="manual-layout"><nav className="manual-nav" aria-label="Match phases">{phases.map((item, index) => <button type="button" key={item.label} aria-current={active === index ? "step" : undefined} onClick={() => setActive(index)} className={active === index ? "manual-nav-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><ArrowRight size={18}/></button>)}</nav>
      <article className="manual-stage" key={active}><div className="manual-stage-top"><span>PHASE {String(active + 1).padStart(2, "0")}</span><span>SYSTEMWARS MATCH</span></div><PhaseScene phase={active}/><div className="manual-stage-bottom"><div><span>{phase.label.toUpperCase()}</span><h2>{phase.title}</h2><p>{phase.detail}</p></div><button type="button" onClick={() => setActive((active + 1) % phases.length)} aria-label={`Next phase: ${phases[(active + 1) % phases.length].label}`}><ArrowRight size={23}/></button></div></article>
    </div>
  </section>;
}
