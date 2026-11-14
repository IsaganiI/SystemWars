"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowRight, Box, Braces, Cloud, Copy, Cpu, Database, Gauge, Globe2, HardDrive, Layers3, MessageSquarePlus, MousePointer2, Network, PencilLine, Play, Radio, Route, Search, Server, ShieldCheck, Workflow, X } from "lucide-react";

const route = [
  { label: "CLIENT", icon: Box },
  { label: "BALANCER", icon: Network },
  { label: "APP", icon: Server },
  { label: "DATABASE", icon: Database },
];

const components = [
  { id: "dns", label: "DNS", group: "EDGE", icon: Globe2, anchor: "client", reason: "Route users to the right entry point." },
  { id: "cdn", label: "CDN", group: "EDGE", icon: Cloud, anchor: "client", reason: "Serve static assets near users before requests reach the app." },
  { id: "gateway", label: "API GATEWAY", group: "EDGE", icon: Route, anchor: "client", reason: "Apply routing and access rules at the edge." },
  { id: "balancer", label: "LOAD BALANCER", group: "EDGE", icon: Network, anchor: "client", reason: "Spread incoming requests across app servers." },
  { id: "waf", label: "WAF", group: "EDGE", icon: ShieldCheck, anchor: "client", reason: "Filter malicious requests before they enter the system." },
  { id: "app", label: "APP SERVER", group: "COMPUTE", icon: Server, anchor: "app", reason: "Run the application logic behind each request." },
  { id: "worker", label: "WORKER", group: "COMPUTE", icon: Cpu, anchor: "app", reason: "Move slow jobs off the request path." },
  { id: "function", label: "FUNCTION", group: "COMPUTE", icon: Braces, anchor: "app", reason: "Run short event driven tasks without a long running server." },
  { id: "container", label: "CONTAINER", group: "COMPUTE", icon: Box, anchor: "app", reason: "Package an app and its dependencies for deployment." },
  { id: "cache", label: "CACHE", group: "DATA", icon: Layers3, anchor: "app", reason: "Cache repeat reads before they reach the database." },
  { id: "database", label: "SQL DATABASE", group: "DATA", icon: Database, anchor: "database", reason: "Store durable transactional data." },
  { id: "nosql", label: "NOSQL DATABASE", group: "DATA", icon: Database, anchor: "database", reason: "Store records without a fixed relational schema." },
  { id: "replica", label: "READ REPLICA", group: "DATA", icon: Copy, anchor: "database", reason: "Send reads to a replica so the primary can keep writing." },
  { id: "storage", label: "OBJECT STORE", group: "DATA", icon: HardDrive, anchor: "app", reason: "Keep uploaded files out of the app server." },
  { id: "search", label: "SEARCH INDEX", group: "DATA", icon: Search, anchor: "database", reason: "Find content without scanning the primary database." },
  { id: "queue", label: "QUEUE", group: "MESSAGING", icon: Workflow, anchor: "app", reason: "Queue checkout requests so a spike does not swamp the app." },
  { id: "stream", label: "EVENT STREAM", group: "MESSAGING", icon: Radio, anchor: "app", reason: "Deliver ordered events to multiple consumers." },
  { id: "pubsub", label: "PUB/SUB", group: "MESSAGING", icon: Radio, anchor: "app", reason: "Fan an event out to independent subscribers." },
  { id: "limiter", label: "RATE LIMITER", group: "CONTROL", icon: Gauge, anchor: "client", reason: "Slow abusive traffic before it reaches the app." },
  { id: "auth", label: "AUTH SERVICE", group: "CONTROL", icon: ShieldCheck, anchor: "app", reason: "Verify users before protected actions run." },
  { id: "breaker", label: "CIRCUIT BREAKER", group: "CONTROL", icon: Network, anchor: "app", reason: "Stop calls to a failing dependency until it recovers." },
  { id: "metrics", label: "METRICS", group: "OBSERVABILITY", icon: Gauge, anchor: "app", reason: "Track latency, errors, and throughput as load changes." },
  { id: "logs", label: "LOGS", group: "OBSERVABILITY", icon: HardDrive, anchor: "app", reason: "Record service events to investigate failures." },
] as const;
type Module = (typeof components)[number]["id"] | "custom" | null;
const sequence: Module[] = [null, "cdn", "cache", "queue", "replica"];
const groups = ["EDGE", "COMPUTE", "DATA", "MESSAGING", "CONTROL", "OBSERVABILITY"] as const;

export function LandingDemo() {
  const [module, setModule] = useState<Module>(null);
  const [traffic, setTraffic] = useState(true);
  const [rivalStep, setRivalStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [manualOverride, setManualOverride] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryGroup, setLibraryGroup] = useState<string>("ALL");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [recent, setRecent] = useState<Exclude<Module, null>[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<{ module: Module; text: string }[]>([]);
  const manualTicks = useRef(0);
  const autoCommented = useRef(false);
  const activeModule = useRef<Module>(null);
  const customComponent = { id: "custom" as const, label: customName.trim() || "CUSTOM", group: "CUSTOM" as const, icon: PencilLine, anchor: "app" as const, reason: customDescription.trim() };
  const selected = module === "custom" ? customComponent : components.find(component => component.id === module);
  const visibleComments = comments.filter(comment => comment.module === module);
  const ExtraIcon = selected?.icon ?? Layers3;
  const nextMove = sequence[(sequence.indexOf(module) + 1) % sequence.length] ?? "remove";
  const clock = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  const reason = selected?.reason ?? "A direct path sends every request to the app and database.";
  const recentComponents = recent.map(id => id === "custom" ? customComponent : components.find(component => component.id === id)).filter(component => component !== undefined);
  const filteredComponents = components.filter(component => (libraryGroup === "ALL" || component.group === libraryGroup) && `${component.label} ${component.group}`.toLowerCase().includes(libraryQuery.trim().toLowerCase()));

  const placeModule = useCallback((next: Module) => {
    activeModule.current = next;
    setModule(next);
    if (next) setRecent(current => [next, ...current.filter(item => item !== next)].slice(0, 6));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRivalStep(step => (step + 1) % 3);
      if (manualTicks.current > 0) {
        if (Number.isFinite(manualTicks.current)) manualTicks.current -= 1;
      } else {
        setManualOverride(false);
        const next = sequence[(sequence.indexOf(activeModule.current) + 1) % sequence.length];
        placeModule(next);
        if (next === "cache" && !autoCommented.current) {
          autoCommented.current = true;
          setComments([{ module: "cache", text: "The database is the first bottleneck." }]);
        }
      }
    }, 2100);
    return () => window.clearInterval(timer);
  }, [placeModule]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(seconds => seconds > 0 ? seconds - 1 : 300), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseModule(next: Exclude<Module, null>) {
    manualTicks.current = 4;
    setManualOverride(true);
    placeModule(activeModule.current === next ? null : next);
    setLibraryOpen(false);
  }

  function openCustom() {
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    setCustomOpen(true);
  }

  function toggleLibrary() {
    const next = !libraryOpen;
    setLibraryOpen(next);
    setCustomOpen(false);
    manualTicks.current = next ? Number.POSITIVE_INFINITY : 4;
    setManualOverride(next);
  }

  function openComment() {
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    setCommentOpen(true);
  }

  function addComment() {
    const text = commentDraft.trim();
    if (!text) return;
    setComments(current => [...current, { module: activeModule.current, text }].slice(-12));
    setCommentDraft("");
    setCommentOpen(false);
    manualTicks.current = 4;
  }

  function saveCustom() {
    if (!customName.trim() || !customDescription.trim()) return;
    setCustomOpen(false);
    setLibraryOpen(false);
    manualTicks.current = 4;
    setManualOverride(true);
    placeModule("custom");
  }

  function dragComponent(event: DragEvent<HTMLButtonElement>, id: Exclude<Module, null>) {
    event.dataTransfer.setData("application/x-systemwars-component", id);
    event.dataTransfer.effectAllowed = "copy";
  }

  function dropComponent(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-systemwars-component");
    if ((id === "custom" && customDescription.trim()) || components.some(component => component.id === id)) {
      manualTicks.current = 4;
      setManualOverride(true);
      placeModule(id as Exclude<Module, null>);
      setLibraryOpen(false);
    }
  }

  return <section className={`landing-demo ${traffic ? "landing-demo-running" : ""}`} aria-label="Interactive architecture battle preview">
    <div className="landing-demo-body">
      <div className="demo-grid"/>
      <div className="demo-matchbar">
        <div className="demo-match-player demo-match-you"><span>1</span><div><strong>YOU</strong><small>BUILDING</small></div></div>
        <div className="demo-match-clock"><small>BUILD PHASE · VS</small><strong>{clock}</strong></div>
        <div className="demo-match-player demo-match-rival"><div><strong>PLAYER 2</strong><small>BUILDING</small></div><span>2</span></div>
      </div>
      <div className="demo-canvas-label">YOUR REQUEST PATH <button type="button" onClick={openComment}><MessageSquarePlus size={14}/> ADD COMMENT</button></div>
      <div className="demo-route">{route.map((item, index) => {
        const Icon = item.icon;
        return <div className="demo-route-step" key={item.label}><div className="demo-node"><Icon size={25}/><strong>{item.label}</strong></div>{index < route.length - 1 && <span className="demo-connection" aria-hidden="true"/>}</div>;
      })}</div>
      <div className={`demo-extension demo-extension-anchor-${selected?.anchor ?? "app"}`} onDragOver={event => event.preventDefault()} onDrop={dropComponent} aria-label="Drop a component onto the canvas"><span className="demo-extension-line"/><div className="demo-extra-stack">{selected ? <><div className="demo-extra" key={module}><ExtraIcon size={25}/><strong>{selected.label}</strong></div><div className="demo-node-note" key={`note-${module}`}><p>{reason}</p></div></> : <div className="demo-extra demo-extra-empty"><span>+</span><strong>ADD A COMPONENT</strong></div>}{visibleComments.length > 0 && !commentOpen && <div className="demo-canvas-comment" key={`${visibleComments.length}-${visibleComments.at(-1)?.text}`}><b>YOU</b><p>{visibleComments.at(-1)?.text}</p><small>{visibleComments.length} {visibleComments.length === 1 ? "COMMENT" : "COMMENTS"}</small></div>}{commentOpen && <div className="demo-canvas-comment-editor"><input value={commentDraft} onChange={event => setCommentDraft(event.target.value)} maxLength={100} placeholder="Write a note" aria-label="Write a note on your design"/><div><button type="button" disabled={!commentDraft.trim()} onClick={addComment}>POST</button><button type="button" onClick={() => { setCommentOpen(false); manualTicks.current = 4; }} aria-label="Close comment editor"><X size={16}/></button></div></div>}</div></div>
      {!manualOverride && <div className={`demo-drag-cursor demo-drag-${nextMove}`} key={rivalStep} aria-hidden="true"><span>{nextMove === "remove" ? selected?.label : components.find(component => component.id === nextMove)?.label}</span><MousePointer2 size={25} fill="currentColor" strokeWidth={1.4}/></div>}
      <div className="demo-controls">
        <div className="demo-tray-head"><span>RECENTLY USED</span></div>
        <div className="demo-catalog-list">{recentComponents.length ? recentComponents.map(component => { const Icon = component.icon; return <button type="button" key={component.id} draggable onDragStart={event => dragComponent(event, component.id)} aria-pressed={module === component.id} onClick={() => chooseModule(component.id)}><Icon size={16}/>{component.label}</button>; }) : <span className="demo-recent-empty">Components you place will appear here.</span>}<button className="demo-more-components" type="button" aria-expanded={libraryOpen} onClick={toggleLibrary}>ALL COMPONENTS <ArrowRight size={14}/></button></div>
        {libraryOpen && <div className="demo-component-library"><div className="demo-library-head"><strong>COMPONENT LIBRARY</strong><span>{components.length + 1} TYPES</span><button type="button" aria-label="Close component library" onClick={toggleLibrary}><X size={17}/></button></div><label className="demo-library-search"><Search size={15}/><input value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)} placeholder="Search components" aria-label="Search components"/></label>
          {customOpen ? <div className="demo-custom-editor"><label htmlFor="demo-custom-name">NAME</label><input id="demo-custom-name" value={customName} onChange={event => setCustomName(event.target.value)} maxLength={20} placeholder="e.g. Fraud check"/><label htmlFor="demo-custom-description">WHAT IT DOES</label><input id="demo-custom-description" value={customDescription} onChange={event => setCustomDescription(event.target.value)} maxLength={100} placeholder="e.g. Validate each checkout event"/><div><button type="button" onClick={() => { setCustomOpen(false); manualTicks.current = Number.POSITIVE_INFINITY; }}>BACK</button><button type="button" disabled={!customName.trim() || !customDescription.trim()} onClick={saveCustom}>ADD TO CANVAS</button></div></div> : <div className="demo-library-layout"><nav className="demo-library-groups" aria-label="Component categories">{["ALL", ...groups].map(group => <button type="button" key={group} aria-current={libraryGroup === group ? "true" : undefined} onClick={() => setLibraryGroup(group)}>{group}</button>)}</nav><div className="demo-library-content"><div className="demo-library-section-title"><span>{libraryGroup === "ALL" ? "ALL COMPONENTS" : libraryGroup}</span><small>DRAG OR CLICK TO PLACE</small></div><div className="demo-library-items">{filteredComponents.map(component => { const Icon = component.icon; return <button type="button" key={component.id} draggable onDragStart={event => dragComponent(event, component.id)} onClick={() => chooseModule(component.id)}><Icon size={22}/><span>{component.label}</span></button>; })}</div><button className="demo-library-custom" type="button" onClick={openCustom}><PencilLine size={18}/><span>CREATE CUSTOM COMPONENT</span><ArrowRight size={15}/></button></div></div>}
        </div>}
      </div>
    </div>
    <div className="landing-demo-bottom"><span className="demo-traffic-state"><i/>{traffic ? "TRAFFIC FLOWING" : "TRAFFIC PAUSED"}</span><button type="button" onClick={() => setTraffic(!traffic)}><Play size={15} fill="currentColor"/>{traffic ? "PAUSE TRAFFIC" : "SEND TRAFFIC"}</button></div>
  </section>;
}
