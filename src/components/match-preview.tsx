"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Box, Check, CircleHelp, Database, HardDrive, Layers3, Network, Plus, Server, ShieldCheck, Trash2, Workflow } from "lucide-react";
import { GameRail, GameTopbar } from "@/components/game-navigation";
import type { Mode } from "@/lib/game-types";

const core = [
  { name: "CLIENT", detail: "Incoming traffic", icon: Box },
  { name: "LOAD BALANCER", detail: "Route requests", icon: Network },
  { name: "APP SERVER", detail: "Process checkout", icon: Server },
  { name: "DATABASE", detail: "Seat inventory", icon: Database },
];
const catalog = [
  { id: "app", name: "APP SERVER", detail: "Additional compute", icon: Server },
  { id: "cache", name: "CACHE", detail: "Faster reads", icon: Layers3 },
  { id: "queue", name: "MESSAGE QUEUE", detail: "Async work", icon: Workflow },
  { id: "replica", name: "DB REPLICA", detail: "Read capacity", icon: HardDrive },
] as const;
type ModuleId = typeof catalog[number]["id"];

export function MatchPreview({ mode, matchId }: { mode: Mode; matchId: string }) {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  function toggle(id: ModuleId) {
    setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function submitDesign() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/design`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ components: modules }) });
      const body = await response.json();
      if (!response.ok) { setSubmitError(body.error ?? "Could not submit the design."); return; }
      router.push(`/results?id=${encodeURIComponent(matchId)}`);
      router.refresh();
    } catch { setSubmitError("Could not submit the design."); }
    finally { setSubmitting(false); }
  }

  return <main className="game-shell"><GameRail active="play"/><div className="game-main"><GameTopbar active="play"/>
    <div className="build-header"><div><Link href="/play" className="match-back"><ArrowLeft size={15}/> BACK TO PLAY</Link><span className="build-kicker">RANKED {mode} / BUILD PHASE</span><h1>Ticket onsale</h1></div><div className="build-header-action"><span>CHALLENGE 01 <b>·</b> TEAM DESIGN</span><button type="button" className="build-submit" disabled={submitting} onClick={submitDesign}>{submitting ? "SUBMITTING" : "SUBMIT DESIGN"} <ArrowRight size={18}/></button>{submitError && <span className="build-error" role="alert">{submitError}</span>}</div></div>
    <div className="build-objectives"><span>100,000 CONCURRENT USERS</span><span>P95 LATENCY ≤ 250 MS</span><span>99.9% AVAILABILITY</span><span>NO OVERSOLD SEATS</span></div>
    <div className="build-grid">
      <aside className="build-catalog" aria-label="Component catalog"><div className="build-panel-head"><span>COMPONENTS</span><small>{core.length + modules.length} ON CANVAS</small></div><div className="build-palette-group"><div className="build-palette-heading"><span>CORE PATH</span><small>PREPLACED</small></div><div className="build-catalog-list">{core.map(item => { const Icon = item.icon; return <div className="build-catalog-item build-catalog-item-core" key={item.name}><Icon size={22}/><span><strong>{item.name}</strong><small>{item.detail}</small></span><Check size={16} aria-label="On canvas"/></div>; })}</div></div><div className="build-palette-group build-palette-group-add"><div className="build-palette-heading"><span>ADD TO DESIGN</span><small>CLICK TO STAGE</small></div><div className="build-catalog-list">{catalog.map(item => { const Icon = item.icon; const active = modules.includes(item.id); return <button key={item.id} type="button" aria-pressed={active} onClick={() => toggle(item.id)} className={`build-catalog-item ${active ? "build-catalog-item-active" : ""}`}><Icon size={22}/><span><strong>{item.name}</strong><small>{item.detail}</small></span>{active ? <Trash2 size={15}/> : <Plus size={16}/>}</button>; })}</div></div></aside>
      <section className="build-workspace" aria-label="Architecture canvas"><div className="build-panel-head"><span>ARCHITECTURE / YOUR DESIGN</span><small>{core.length + modules.length} COMPONENTS</small></div><div className="build-canvas"><div className="canvas-coordinate">REQUEST PATH</div><div className="architecture-core">{core.map((item, index) => { const Icon = item.icon; return <div className="architecture-step" key={item.name}><div className="architecture-node"><Icon size={24}/><strong>{item.name}</strong><small>{item.detail}</small></div>{index < core.length - 1 && <span className="architecture-connector" aria-hidden="true"/>}</div>; })}</div><div className="architecture-staging"><div className="staging-head"><span>STAGED COMPONENTS</span><small>{modules.length} ADDED</small></div><div className="staging-items">{modules.length ? modules.map(id => { const item = catalog.find(component => component.id === id)!; const Icon = item.icon; return <button type="button" key={id} onClick={() => toggle(id)} aria-label={`Remove ${item.name}`}><Icon size={19}/>{item.name}<Trash2 size={14}/></button>; }) : <span className="staging-empty">Select components from the left panel</span>}</div></div></div><div className="build-canvas-footer"><span><ShieldCheck size={15}/> SAVED WHEN SUBMITTED · SIMULATION PENDING</span><span>{modules.length} OPTIONAL MODULES</span></div></section>
      <aside className="build-conditions" aria-label="Match conditions"><div className="build-panel-head"><span>DESIGN STATUS</span><small>BUILD PHASE</small></div><div className="build-conditions-body"><div className="build-status-section"><h2>Architecture</h2><div className="build-status-row"><span>Components</span><strong>{core.length + modules.length}</strong></div><div className="build-status-row"><span>Optional modules</span><strong>{modules.length} / {catalog.length}</strong></div><div className="build-status-row"><span>Simulation</span><strong className="build-status-pending">PENDING</strong></div></div><div className="build-status-section"><h3>REQUIREMENTS</h3><p className="build-status-note">Checked when simulation runs.</p><ul className="build-requirements"><li><span className="build-requirement-box"/>Handle 100,000 concurrent users</li><li><span className="build-requirement-box"/>Keep checkout available during an app server failure</li><li><span className="build-requirement-box"/>Never sell the same seat twice</li></ul></div><div className="build-status-section"><h3>TEST SCENARIO</h3><div className="condition-event"><span>01</span><strong>TRAFFIC SPIKE</strong></div><div className="condition-event"><span>02</span><strong>APP FAILURE</strong></div></div><div className="build-status-foot"><CircleHelp size={16}/><span>Performance results appear after the simulator is connected.</span></div></div></aside>
    </div>
    <div className="build-phase"><span>PHASE</span><strong><b>01</b> BUILD</strong><i/><span><b>02</b> SIMULATE</span><i/><span><b>03</b> COMPARE</span></div>
  </div></main>;
}
