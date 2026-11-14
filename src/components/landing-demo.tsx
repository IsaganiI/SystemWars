"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Database, Layers3, MousePointer2, Network, Play, Server, Workflow } from "lucide-react";

const route = [
  { label: "CLIENT", icon: Box },
  { label: "BALANCER", icon: Network },
  { label: "APP", icon: Server },
  { label: "DATABASE", icon: Database },
];

type Module = "cache" | "queue" | null;

export function LandingDemo() {
  const [module, setModule] = useState<Module>(null);
  const [traffic, setTraffic] = useState(true);
  const [rivalStep, setRivalStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [manualOverride, setManualOverride] = useState(false);
  const manualUntil = useRef(0);
  const ExtraIcon = module === "cache" ? Layers3 : Workflow;
  const nextMove = module === null ? "cache" : module === "cache" ? "queue" : "remove";
  const clock = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  const reason = module === "cache"
    ? "Cache repeat reads before they reach the database."
    : module === "queue"
      ? "Queue checkout requests so a spike does not swamp the app."
      : "A direct path sends every request to the app and database.";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRivalStep(step => (step + 1) % 3);
      if (Date.now() >= manualUntil.current) {
        setManualOverride(false);
        setModule(current => current === null ? "cache" : current === "cache" ? "queue" : null);
      }
    }, 2100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(seconds => seconds > 0 ? seconds - 1 : 300), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseModule(next: "cache" | "queue") {
    manualUntil.current = Date.now() + 8000;
    setManualOverride(true);
    setModule(current => current === next ? null : next);
  }

  return <section className={`landing-demo ${traffic ? "landing-demo-running" : ""}`} aria-label="Interactive architecture battle preview">
    <div className="landing-demo-body">
      <div className="demo-grid"/>
      <div className="demo-matchbar">
        <div className="demo-match-player demo-match-you"><span>1</span><div><strong>YOU</strong><small>BUILDING</small></div></div>
        <div className="demo-match-clock"><small>BUILD PHASE · VS</small><strong>{clock}</strong></div>
        <div className="demo-match-player demo-match-rival"><div><strong>PLAYER 2</strong><small>BUILDING</small></div><span>2</span></div>
      </div>
      <div className="demo-canvas-label">YOUR REQUEST PATH</div>
      <div className="demo-route">{route.map((item, index) => {
        const Icon = item.icon;
        return <div className="demo-route-step" key={item.label}><div className="demo-node"><Icon size={25}/><strong>{item.label}</strong></div>{index < route.length - 1 && <span className="demo-connection" aria-hidden="true"/>}</div>;
      })}</div>
      <div className="demo-extension"><span className="demo-extension-line"/>{module ? <div className="demo-extra" key={module}><ExtraIcon size={25}/><strong>{module === "cache" ? "CACHE" : "QUEUE"}</strong></div> : <div className="demo-extra demo-extra-empty"><span>+</span><strong>ADD A COMPONENT</strong></div>}</div>
      {!manualOverride && <div className={`demo-drag-cursor demo-drag-${nextMove}`} key={rivalStep} aria-hidden="true"><span>{nextMove === "remove" ? "QUEUE" : nextMove.toUpperCase()}</span><MousePointer2 size={25} fill="currentColor" strokeWidth={1.4}/></div>}
      <div className="demo-controls"><span>ADD / REMOVE</span><div><button type="button" aria-pressed={module === "cache"} onClick={() => chooseModule("cache")}><Layers3 size={17}/> CACHE</button><button type="button" aria-pressed={module === "queue"} onClick={() => chooseModule("queue")}><Workflow size={17}/> QUEUE</button></div></div>
      <p className="demo-reason" key={module ?? "direct"}>{reason}</p>
      <div className="demo-opponent"><span className="demo-opponent-caption">OPPONENT CANVAS <small>DESIGN HIDDEN</small></span><div className="demo-opponent-activity" aria-hidden="true">{[0, 1, 2].map(index => <i key={index} className={rivalStep === index ? "demo-opponent-active" : ""}/>)}</div></div>
    </div>
    <div className="landing-demo-bottom"><span className="demo-traffic-state"><i/>{traffic ? "TRAFFIC FLOWING" : "TRAFFIC PAUSED"}</span><button type="button" onClick={() => setTraffic(!traffic)}><Play size={15} fill="currentColor"/>{traffic ? "PAUSE TRAFFIC" : "SEND TRAFFIC"}</button></div>
  </section>;
}
