"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { ArrowRight, ArrowUpRight, Box, Braces, Cloud, Copy, Cpu, Database, Gauge, Globe2, HardDrive, Layers3, MessageSquarePlus, MousePointer2, Network, PencilLine, Play, Radio, Route, Search, Server, ShieldCheck, Workflow, X } from "lucide-react";

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
type CanvasPoint = { x: number; y: number };
type CanvasComment = CanvasPoint & { id: number; text: string };
type CanvasArrow = { id: number; start: CanvasPoint; end: CanvasPoint };
const sequence: Module[] = [null, "cdn", "cache", "queue", "replica"];
const groups = ["EDGE", "COMPUTE", "DATA", "MESSAGING", "CONTROL", "OBSERVABILITY"] as const;
const demoCommentText = "This is where traffic fans out.";

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
  const [annotationTool, setAnnotationTool] = useState<"comment" | "arrow" | null>(null);
  const [commentPosition, setCommentPosition] = useState<CanvasPoint | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<CanvasComment[]>([]);
  const [arrows, setArrows] = useState<CanvasArrow[]>([]);
  const [draftArrow, setDraftArrow] = useState<CanvasArrow | null>(null);
  const [demoTyping, setDemoTyping] = useState(false);
  const [demoDrawing, setDemoDrawing] = useState(false);
  const manualTicks = useRef(0);
  const autoCommented = useRef(false);
  const activeModule = useRef<Module>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nextAnnotationId = useRef(1);
  const draggingComment = useRef<number | null>(null);
  const drawingArrow = useRef<CanvasArrow | null>(null);
  const customComponent = { id: "custom" as const, label: customName.trim() || "CUSTOM", group: "CUSTOM" as const, icon: PencilLine, anchor: "app" as const, reason: customDescription.trim() };
  const selected = module === "custom" ? customComponent : components.find(component => component.id === module);
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
          setComments(current => [{ id: 0, x: 28, y: 76, text: "" }, ...current]);
          setDemoTyping(true);
        }
      }
    }, 2100);
    return () => window.clearInterval(timer);
  }, [placeModule]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(seconds => seconds > 0 ? seconds - 1 : 300), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!demoTyping) return;
    const text = demoCommentText;
    let letters = 0;
    const timer = window.setInterval(() => {
      letters = Math.min(text.length, letters + 1);
      setComments(current => current.map(comment => comment.id === 0 ? { ...comment, text: text.slice(0, letters) } : comment));
      if (letters === text.length) {
        window.clearInterval(timer);
        setDemoTyping(false);
        setArrows(current => [{ id: 0, start: { x: 34, y: 64 }, end: { x: 40, y: 35 } }, ...current]);
        setDemoDrawing(true);
      }
    }, 48);
    return () => window.clearInterval(timer);
  }, [demoTyping]);

  useEffect(() => {
    if (!demoDrawing) return;
    const timer = window.setTimeout(() => setDemoDrawing(false), 1050);
    return () => window.clearTimeout(timer);
  }, [demoDrawing]);

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

  function selectAnnotationTool(tool: "comment" | "arrow") {
    const next = annotationTool === tool ? null : tool;
    setAnnotationTool(next);
    setCommentPosition(null);
    setDraftArrow(null);
    drawingArrow.current = null;
    manualTicks.current = next ? Number.POSITIVE_INFINITY : 4;
    setManualOverride(Boolean(next));
  }

  function canvasPoint(clientX: number, clientY: number, bubble = false): CanvasPoint {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 50, y: 50 };
    const horizontalInset = bubble ? Math.min(28, 85 / bounds.width * 100) : 2;
    const verticalInset = bubble ? 15 : 3;
    return {
      x: Math.max(horizontalInset, Math.min(100 - horizontalInset, (clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(verticalInset, Math.min(100 - verticalInset, (clientY - bounds.top) / bounds.height * 100)),
    };
  }

  function addComment() {
    const text = commentDraft.trim();
    if (!text || !commentPosition) return;
    setComments(current => [...current, { id: nextAnnotationId.current++, ...commentPosition, text }].slice(-12));
    setCommentDraft("");
    setCommentPosition(null);
    setAnnotationTool(null);
    manualTicks.current = 4;
  }

  function onCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (annotationTool !== "arrow" || event.button !== 0) return;
    const start = canvasPoint(event.clientX, event.clientY);
    const arrow = { id: nextAnnotationId.current++, start, end: start };
    drawingArrow.current = arrow;
    setDraftArrow(arrow);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drawingArrow.current) return;
    const arrow = { ...drawingArrow.current, end: canvasPoint(event.clientX, event.clientY) };
    drawingArrow.current = arrow;
    setDraftArrow(arrow);
  }

  function onCanvasPointerUp(event: PointerEvent<HTMLDivElement>) {
    const arrow = drawingArrow.current;
    if (!arrow) return;
    const end = canvasPoint(event.clientX, event.clientY);
    if (Math.hypot(end.x - arrow.start.x, end.y - arrow.start.y) > 5) {
      setArrows(current => [...current, { ...arrow, end }].slice(-12));
    }
    drawingArrow.current = null;
    setDraftArrow(null);
    setAnnotationTool(null);
    manualTicks.current = 4;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onCommentPointerDown(event: PointerEvent<HTMLDivElement>, id: number) {
    if (annotationTool || event.button !== 0) return;
    draggingComment.current = id;
    const move = (pointer: globalThis.PointerEvent) => {
      if (draggingComment.current !== id) return;
      const next = canvasPoint(pointer.clientX, pointer.clientY, true);
      setComments(current => current.map(comment => comment.id === id ? { ...comment, ...next } : comment));
    };
    const stop = () => {
      draggingComment.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    event.preventDefault();
    event.stopPropagation();
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
      <div className="demo-canvas-label"><div className="demo-annotation-tools"><button type="button" aria-pressed={annotationTool === "comment"} onClick={() => selectAnnotationTool("comment")}><MessageSquarePlus size={14}/> COMMENT</button><button type="button" aria-pressed={annotationTool === "arrow"} onClick={() => selectAnnotationTool("arrow")}><ArrowUpRight size={14}/> ARROW</button></div></div>
      <div ref={canvasRef} className={`demo-drawing-surface ${annotationTool ? `demo-drawing-${annotationTool}` : ""}`} onClick={event => { if (annotationTool === "comment" && !commentPosition) setCommentPosition(canvasPoint(event.clientX, event.clientY, true)); }} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={() => { drawingArrow.current = null; setDraftArrow(null); }}>
        <div className="demo-route">{route.map((item, index) => {
          const Icon = item.icon;
          return <div className="demo-route-step" key={item.label}><div className="demo-node"><Icon size={25}/><strong>{item.label}</strong></div>{index < route.length - 1 && <span className="demo-connection" aria-hidden="true"/>}</div>;
        })}</div>
        <div className={`demo-extension demo-extension-anchor-${selected?.anchor ?? "app"}`} onDragOver={event => event.preventDefault()} onDrop={dropComponent} aria-label="Drop a component onto the canvas"><span className="demo-extension-line"/><div className="demo-extra-stack">{selected ? <><div className="demo-extra" key={module}><ExtraIcon size={25}/><strong>{selected.label}</strong></div><div className="demo-node-note" key={`note-${module}`}><p>{reason}</p></div></> : <div className="demo-extra demo-extra-empty"><span>+</span><strong>ADD A COMPONENT</strong></div>}</div></div>
        <svg className="demo-annotation-arrows" aria-hidden="true"><defs><marker id="demo-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#c2d1e5" strokeWidth="1.3"/></marker></defs>{[...arrows, ...(draftArrow ? [draftArrow] : [])].map(arrow => <line key={arrow.id} className={arrow.id === 0 ? "demo-auto-arrow" : undefined} pathLength={100} x1={`${arrow.start.x}%`} y1={`${arrow.start.y}%`} x2={`${arrow.end.x}%`} y2={`${arrow.end.y}%`} markerEnd="url(#demo-arrowhead)"/>)}</svg>
        {demoDrawing && <MousePointer2 className="demo-annotation-cursor" size={20} fill="currentColor" strokeWidth={1.2} aria-hidden="true"/>}
        {comments.map(comment => <div key={comment.id} className={`demo-canvas-comment ${comment.id === 0 && demoTyping ? "demo-canvas-comment-typing" : ""}`} style={{ left: `${comment.x}%`, top: `${comment.y}%` }} onPointerDown={event => onCommentPointerDown(event, comment.id)} onClick={event => event.stopPropagation()}><p>{comment.text}</p></div>)}
        {commentPosition && <div className="demo-canvas-comment-editor" style={{ left: `${commentPosition.x}%`, top: `${commentPosition.y}%` }} onClick={event => event.stopPropagation()}><textarea value={commentDraft} onChange={event => setCommentDraft(event.target.value)} maxLength={120} placeholder="Write a comment" aria-label="Comment on your design" autoFocus/><div><button type="button" disabled={!commentDraft.trim()} onClick={addComment}>POST</button><button type="button" onClick={() => { setCommentPosition(null); setAnnotationTool(null); manualTicks.current = 4; }} aria-label="Cancel comment"><X size={16}/></button></div></div>}
        {annotationTool && !commentPosition && !draftArrow && <span className="demo-annotation-hint">{annotationTool === "comment" ? "CLICK ANYWHERE TO PLACE A COMMENT" : "DRAG ANYWHERE TO DRAW AN ARROW"}</span>}
      </div>
      {!manualOverride && !demoTyping && !demoDrawing && <div className={`demo-drag-cursor demo-drag-${nextMove}`} key={rivalStep} aria-hidden="true"><span>{nextMove === "remove" ? selected?.label : components.find(component => component.id === nextMove)?.label}</span><MousePointer2 size={25} fill="currentColor" strokeWidth={1.4}/></div>}
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
