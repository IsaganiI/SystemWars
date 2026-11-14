"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Database, Layers3, Network, Play, Server, Workflow } from "lucide-react";

const route = [
  { label: "CLIENT", icon: Box },
  { label: "BALANCER", icon: Network },
  { label: "APP", icon: Server },
  { label: "DATABASE", icon: Database },
];

export function LandingDemo() {
  const [module, setModule] = useState<"cache" | "queue" | null>(null);
  const [traffic, setTraffic] = useState(true);
  const [rivalStep, setRivalStep] = useState(0);
  const manualUntil = useRef(0);
  const ExtraIcon = module === "cache" ? Layers3 : Workflow;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRivalStep(step => (step + 1) % 3);
      if (Date.now() >= manualUntil.current) setModule(current => current === null ? "cache" : current === "cache" ? "queue" : null);
    }, 2100);
    return () => window.clearInterval(timer);
  }, []);

  function chooseModule(next: "cache" | "queue") {
    manualUntil.current = Date.now() + 8000;
    setModule(current => current === next ? null : next);
  }

  return <section className={`landing-demo ${traffic ? "landing-demo-running" : ""}`} aria-label="Interactive architecture canvas"><div className="landing-demo-body"><div className="demo-grid"/><div className="demo-canvas-label">YOUR REQUEST PATH <span>YOU <b>VS</b> PLAYER 2</span></div><div className="demo-route">{route.map((item, index) => { const Icon = item.icon; return <div className="demo-route-step" key={item.label}><div className="demo-node"><Icon size={25}/><strong>{item.label}</strong></div>{index < route.length - 1 && <span className="demo-connection" aria-hidden="true"/>}</div>; })}</div><div className="demo-extension"><span className="demo-extension-line"/>{module ? <div className="demo-extra" key={module}><ExtraIcon size={25}/><strong>{module === "cache" ? "CACHE" : "QUEUE"}</strong></div> : <div className="demo-extra demo-extra-empty"><span>+</span><strong>ADD A COMPONENT</strong></div>}</div><div className="demo-controls"><span>ADD / REMOVE</span><div><button type="button" aria-pressed={module === "cache"} onClick={() => chooseModule("cache")}><Layers3 size={17}/> CACHE</button><button type="button" aria-pressed={module === "queue"} onClick={() => chooseModule("queue")}><Workflow size={17}/> QUEUE</button></div></div><div className="demo-opponent"><span className="demo-opponent-avatar">2</span><div className="demo-opponent-name"><strong>PLAYER 2</strong><small>BUILDING · DESIGN HIDDEN</small></div><div className="demo-opponent-activity" aria-hidden="true">{[0, 1, 2].map(index => <i key={index} className={rivalStep === index ? "demo-opponent-active" : ""}/>)}</div></div></div><div className="landing-demo-bottom"><span className="demo-traffic-state"><i/>{traffic ? "TRAFFIC FLOWING" : "TRAFFIC PAUSED"}</span><button type="button" onClick={() => setTraffic(!traffic)}><Play size={15} fill="currentColor"/>{traffic ? "PAUSE TRAFFIC" : "SEND TRAFFIC"}</button></div></section>;
}
