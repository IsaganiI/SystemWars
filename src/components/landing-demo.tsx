"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Box, Braces, CalendarClock, ChevronDown, Cloud, Copy, Cpu, CreditCard, Database, Film, Gauge, Globe2, HardDrive, Layers3, MousePointer2, Network, PencilLine, Play, Radio, Route, Search, Server, ShieldCheck, Workflow, X } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchVoiceChat } from "@/components/match-voice-chat";
import type { Mode } from "@/lib/game-types";
import type { MatchBrief } from "@/lib/match-scenarios";
import { PACE } from "@/lib/match-pace";
import { diffCanvas, emptyCanvas, type CanvasOperation, type SharedCanvas } from "@/lib/shared-canvas";

const graphNodes = [
  { id: "client", label: "Client", icon: Box },
  { id: "dns", label: "DNS", icon: Globe2 },
  { id: "balancer", label: "Load Balancer", icon: Network },
  { id: "appA", label: "App Server", icon: Server },
  { id: "appB", label: "App Server", icon: Server },
  { id: "database", label: "Database", icon: Database },
  { id: "worker", label: "Worker", icon: Cpu },
  { id: "storage", label: "Object Store", icon: HardDrive },
] as const;
const graphEdges = [
  { from: "client", to: "dns" },
  { from: "dns", to: "balancer" },
  { from: "balancer", to: "appA" },
  { from: "balancer", to: "appB" },
  { from: "appA", to: "database", vertical: true },
  { from: "appB", to: "database" },
  { from: "appB", to: "worker", vertical: true },
  { from: "worker", to: "storage" },
] as const;

const components = [
  { id: "dns", label: "DNS", group: "EDGE", icon: Globe2, anchor: "client", reason: "Route users to the right entry point." },
  { id: "cdn", label: "CDN", group: "EDGE", icon: Cloud, anchor: "client", reason: "Serve static assets near users before requests reach the app." },
  { id: "gateway", label: "API GATEWAY", group: "EDGE", icon: Route, anchor: "client", reason: "Apply routing and access rules at the edge." },
  { id: "balancer", label: "LOAD BALANCER", group: "EDGE", icon: Network, anchor: "client", reason: "Spread incoming requests across app servers." },
  { id: "waf", label: "WAF", group: "EDGE", icon: ShieldCheck, anchor: "client", reason: "Filter malicious requests before they enter the system." },
  { id: "websocket", label: "WEBSOCKET GATEWAY", group: "EDGE", icon: Radio, anchor: "client", reason: "Keep live two-way connections open for chat and real-time updates." },
  { id: "app", label: "APP SERVER", group: "COMPUTE", icon: Server, anchor: "app", reason: "Run the application logic behind each request." },
  { id: "worker", label: "WORKER", group: "COMPUTE", icon: Cpu, anchor: "app", reason: "Move slow jobs off the request path." },
  { id: "function", label: "FUNCTION", group: "COMPUTE", icon: Braces, anchor: "app", reason: "Run short event driven tasks without a long running server." },
  { id: "container", label: "CONTAINER", group: "COMPUTE", icon: Box, anchor: "app", reason: "Package an app and its dependencies for deployment." },
  { id: "payment", label: "PAYMENT SERVICE", group: "COMPUTE", icon: CreditCard, anchor: "app", reason: "Authorize purchases without putting card handling in the core app." },
  { id: "transcoder", label: "MEDIA TRANSCODER", group: "COMPUTE", icon: Film, anchor: "app", reason: "Convert uploaded video into formats and bitrates viewers can stream." },
  { id: "scheduler", label: "SCHEDULER", group: "COMPUTE", icon: CalendarClock, anchor: "app", reason: "Trigger timed jobs such as releases, retries, and cleanup." },
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
const componentDisplayNames: Record<Exclude<Module, null>, string> = {
  dns: "DNS", cdn: "CDN", gateway: "API Gateway", balancer: "Load Balancer", waf: "WAF", websocket: "WebSocket Gateway",
  app: "App Server", worker: "Worker", function: "Function", container: "Container", payment: "Payment Service", transcoder: "Media Transcoder", scheduler: "Scheduler",
  cache: "Cache", database: "Database", nosql: "NoSQL Database", replica: "Read Replica", storage: "Object Store", search: "Search Index",
  queue: "Message Queue", stream: "Stream", pubsub: "Pub/Sub",
  limiter: "Rate Limiter", auth: "Auth Service", breaker: "Circuit Breaker", metrics: "Metrics", logs: "Logs", custom: "Custom Component",
};
type CanvasPoint = { x: number; y: number };
type NodeAnchor = CanvasPoint & { side: "left" | "right" | "top" | "bottom" };
type CanvasComment = CanvasPoint & { id: number; text: string };
type CanvasArrow = { id: number; start: CanvasPoint; end: CanvasPoint };
type CanvasGesture = { pointerId: number; clientX: number; clientY: number; arrow: CanvasArrow };
type DragMotion = { id: number; label: string; startX: number; startY: number; endX: number; endY: number };
type DemoPointer = { x: number; y: number; pressed: boolean };
type GraphPath = { id: string; d: string };
type PlacedComponent = { id: string; componentId: Exclude<Module, null>; x: number; y: number; name?: string; description?: string };
type GraphConnection = { id: string; from: string; to: string; fromAnchor?: NodeAnchor; toAnchor?: NodeAnchor };
type DraftConnection = { from: string; start: CanvasPoint; end: CanvasPoint; axis?: "horizontal" | "vertical"; progress?: number };
function pointOnRoute(start: CanvasPoint, end: CanvasPoint, axis: "horizontal" | "vertical", progress: number): CanvasPoint {
  const points = axis === "horizontal"
    ? [start, { x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }, end]
    : [start, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, end];
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const fraction = lengths[index] ? remaining / lengths[index] : 0;
      return { x: points[index].x + (points[index + 1].x - points[index].x) * fraction, y: points[index].y + (points[index + 1].y - points[index].y) * fraction };
    }
    remaining -= lengths[index];
  }
  return end;
}
const sequence: Module[] = [null, "cdn", "cache", "queue", "replica"];
const autoPositions: Record<Exclude<Module, null>, { desktop: CanvasPoint; mobile: CanvasPoint }> = {
  dns: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  cdn: { desktop: { x: 25, y: 55 }, mobile: { x: 14, y: 60 } },
  gateway: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  balancer: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  waf: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  websocket: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  app: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  worker: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  function: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  container: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  payment: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  transcoder: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  scheduler: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  cache: { desktop: { x: 56, y: 58 }, mobile: { x: 50, y: 61 } },
  database: { desktop: { x: 88, y: 56 }, mobile: { x: 50, y: 58 } },
  nosql: { desktop: { x: 88, y: 56 }, mobile: { x: 50, y: 58 } },
  replica: { desktop: { x: 88, y: 56 }, mobile: { x: 86, y: 46 } },
  storage: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  search: { desktop: { x: 88, y: 56 }, mobile: { x: 50, y: 58 } },
  queue: { desktop: { x: 43, y: 79 }, mobile: { x: 14, y: 84 } },
  stream: { desktop: { x: 43, y: 79 }, mobile: { x: 17, y: 80 } },
  pubsub: { desktop: { x: 43, y: 79 }, mobile: { x: 17, y: 80 } },
  limiter: { desktop: { x: 25, y: 55 }, mobile: { x: 17, y: 58 } },
  auth: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  breaker: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
  metrics: { desktop: { x: 43, y: 79 }, mobile: { x: 17, y: 80 } },
  logs: { desktop: { x: 43, y: 79 }, mobile: { x: 17, y: 80 } },
  custom: { desktop: { x: 43, y: 58 }, mobile: { x: 50, y: 58 } },
};
const groups = ["EDGE", "COMPUTE", "DATA", "MESSAGING", "CONTROL", "OBSERVABILITY"] as const;
const paletteCategories = [
  { label: "COMPUTE", title: "Compute", ids: ["app", "worker", "function", "container", "payment", "transcoder", "scheduler"] },
  { label: "STORAGE", title: "Storage", ids: ["database", "nosql", "cache", "replica", "storage", "search"] },
  { label: "NETWORKING", title: "Networking", ids: ["dns", "cdn", "gateway", "balancer", "waf", "websocket"] },
  { label: "MESSAGING", title: "Messaging", ids: ["queue", "stream", "pubsub"] },
  { label: "CONTROL", title: "Control", ids: ["limiter", "auth", "breaker"] },
  { label: "OBSERVABILITY", title: "Observability", ids: ["metrics", "logs"] },
] as const;
const desktopCommentText = "Cache hot reads here.";

/** buildEndsAt is the server-owned build deadline; serverNow is the server time when it was read, to correct clock drift. */
export type LiveMatch = { id: string; userId: string; mode: Mode; handle: string; opponents: string[]; opponentIds?: string[]; aiTeammates?: number; isNpc: boolean; scenario: string; rankTone: string; initialCanvas: SharedCanvas; initialRevision: number; buildEndsAt?: number | null; serverNow?: number };

export function LandingDemo({ match, brief }: { match?: LiveMatch; brief?: MatchBrief }) {
  const router = useRouter();
  const showStarterGraph = !match;
  const [module, setModule] = useState<Module>(null);
  const [armedComponent, setArmedComponent] = useState<Exclude<Module, null> | null>(null);
  const [placementGhost, setPlacementGhost] = useState<CanvasPoint | null>(null);
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>(() => match?.initialCanvas.nodes as PlacedComponent[] ?? []);
  const [connections, setConnections] = useState<GraphConnection[]>(() => match?.initialCanvas.edges as GraphConnection[] ?? []);
  const [draftConnection, setDraftConnection] = useState<DraftConnection | null>(null);
  const [recentConnectionId, setRecentConnectionId] = useState<string | null>(null);
  const [traffic, setTraffic] = useState(!match);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(match ? 0 : 300);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryGroup, setLibraryGroup] = useState<string>("ALL");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("COMPUTE");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [helpNodeId, setHelpNodeId] = useState<string | null>(null);
  const [placedMenuOpen, setPlacedMenuOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [commentPosition, setCommentPosition] = useState<CanvasPoint | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<CanvasComment[]>(() => match?.initialCanvas.notes ?? []);
  const [arrows, setArrows] = useState<CanvasArrow[]>(() => match?.initialCanvas.strokes ?? []);
  const [draftArrow, setDraftArrow] = useState<CanvasArrow | null>(null);
  const [demoTyping, setDemoTyping] = useState(false);
  const [demoDrawing, setDemoDrawing] = useState(false);
  const [dragMotion, setDragMotion] = useState<DragMotion | null>(null);
  const [demoPointer, setDemoPointer] = useState<DemoPointer | null>(null);
  const [autoCommentText, setAutoCommentText] = useState(desktopCommentText);
  const [graphPaths, setGraphPaths] = useState<GraphPath[]>([]);
  const [graphSize, setGraphSize] = useState({ width: 1, height: 1 });
  const [syncError, setSyncError] = useState("");
  const savedCanvas = useRef<SharedCanvas>(match?.initialCanvas ?? emptyCanvas());
  const revision = useRef(match?.initialRevision ?? 0);
  const pendingOperations = useRef<CanvasOperation[]>([]);
  const savePromise = useRef<Promise<boolean> | null>(null);
  const applyingRemote = useRef(false);
  const lastLocalEdit = useRef(0);
  // Build clock: the deadline comes from the server; the offset corrects for this browser's clock drift.
  const [buildEndsAt, setBuildEndsAt] = useState<number | null>(match?.buildEndsAt ?? null);
  const clockOffset = useRef(0);
  const autoSubmitted = useRef(false);
  // False until the first countdown tick, so the initial 0 is never mistaken for time-up.
  const [clockSynced, setClockSynced] = useState(false);
  const manualTicks = useRef(0);
  const autoCommented = useRef(false);
  const autoArrowStarted = useRef(false);
  const activeModule = useRef<Module>(null);
  const nextNodeId = useRef(1);
  const autoNodeIds = useRef<string[]>([]);
  const connectingFrom = useRef<{ id: string; anchor: NodeAnchor } | null>(null);
  const movingNode = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number; width: number; height: number } | null>(null);
  const nextConnectionId = useRef(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const motionId = useRef(0);
  const cancelCommentRef = useRef(false);
  const nextAnnotationId = useRef(1);
  const draggingComment = useRef<number | null>(null);
  const drawingArrow = useRef<CanvasArrow | null>(null);
  const canvasGesture = useRef<CanvasGesture | null>(null);
  const customComponent = { id: "custom" as const, label: customName.trim() || "CUSTOM", group: "CUSTOM" as const, icon: PencilLine, anchor: "app" as const, reason: customDescription.trim() };
  const detailsOpen = helpNodeId !== null;
  const autoArrow = arrows.find(arrow => arrow.id === 0);
  const clock = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  const filteredComponents = components.filter(component => (libraryGroup === "ALL" || component.group === libraryGroup) && `${component.label} ${component.group}`.toLowerCase().includes(libraryQuery.trim().toLowerCase()));
  const submitReady = placedComponents.length >= 2 && connections.length >= 1;
  const counting = Boolean(match && buildEndsAt && clockSynced);
  const timeWarning = counting && secondsLeft <= PACE.warningSeconds;
  const timeUp = counting && secondsLeft === 0;
  const matchCanvasStatus = syncError || (placedComponents.length < 2 ? "PLACE TWO COMPONENTS" : connections.length < 1 ? "CONNECT YOUR COMPONENTS" : match?.mode === "1v1" ? "DESIGN SAVED LIVE" : "TEAM CANVAS LIVE");
  const nodeLabel = (id: string) => {
    const item = placedComponents.find(node => node.id === id);
    return item ? item.name ?? componentDisplayNames[item.componentId] : "Component";
  };

  const flushCanvas = useCallback(async (): Promise<boolean> => {
    if (!match) return true;
    if (savePromise.current) {
      if (!await savePromise.current) return false;
    }
    if (!pendingOperations.current.length) return true;
    const save = async () => {
      while (pendingOperations.current.length) {
        const operations = pendingOperations.current.splice(0, 100);
        try {
          const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/canvas`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operations }) });
          if (!response.ok) throw new Error("save failed");
          setSyncError("");
        } catch {
          pendingOperations.current.unshift(...operations);
          setSyncError("Canvas is offline. Your edits are still here; reconnect before submitting.");
          return false;
        }
      }
      return true;
    };
    const task = save();
    savePromise.current = task;
    const result = await task;
    if (savePromise.current === task) savePromise.current = null;
    return result;
  }, [match]);

  useEffect(() => {
    if (!match) return;
    const canvas: SharedCanvas = { nodes: placedComponents, edges: connections, notes: comments, strokes: arrows };
    if (applyingRemote.current) {
      applyingRemote.current = false;
      savedCanvas.current = canvas;
      return;
    }
    const operations = diffCanvas(savedCanvas.current, canvas);
    if (!operations.length) return;
    lastLocalEdit.current = Date.now();
    for (const operation of operations) {
      const itemId = operation.action === "upsert" ? operation.item.id : operation.id;
      pendingOperations.current = pendingOperations.current.filter(existing => existing.collection !== operation.collection || (existing.action === "upsert" ? existing.item.id : existing.id) !== itemId);
      pendingOperations.current.push(operation);
    }
    savedCanvas.current = canvas;
  }, [match, placedComponents, connections, comments, arrows]);

  useEffect(() => {
    if (!match) return;
    let active = true;
    const endpoint = `/api/matches/${encodeURIComponent(match.id)}/canvas`;
    const timer = window.setInterval(() => { if (active) void flushCanvas(); }, 450);
    const poll = window.setInterval(async () => {
      if (!active || pendingOperations.current.length || savePromise.current || movingNode.current || draggingComment.current || Date.now() - lastLocalEdit.current < 800) return;
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error("Canvas connection lost");
        const next = await response.json() as { canvas: SharedCanvas; revision: number; submitted?: boolean; serverNow?: number; buildEndsAt?: number | null };
        if (!active) return;
        if (next.serverNow) clockOffset.current = next.serverNow - Date.now();
        if (next.buildEndsAt) setBuildEndsAt(next.buildEndsAt);
        if (next.submitted) { router.replace(`/results?id=${encodeURIComponent(match.id)}`); return; }
        setSyncError("");
        if (next.revision <= revision.current || pendingOperations.current.length) return;
        revision.current = next.revision;
        savedCanvas.current = next.canvas;
        applyingRemote.current = true;
        setPlacedComponents(next.canvas.nodes as PlacedComponent[]);
        setConnections(next.canvas.edges as GraphConnection[]);
        setComments(next.canvas.notes);
        setArrows(next.canvas.strokes);
      } catch { if (active) setSyncError("Canvas connection lost. Reconnecting…"); }
    }, 1100);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(poll); };
  }, [match, flushCanvas, router]);

  useEffect(() => {
    if (!referenceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setReferenceOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [referenceOpen]);

  const placeModule = useCallback((next: Exclude<Module, null>, point: CanvasPoint) => {
    const id = match ? `placed-${crypto.randomUUID()}` : `placed-${nextNodeId.current++}`;
    setPlacedComponents(current => [...current, { id, componentId: next, ...point, ...(next === "custom" ? { name: customName.trim() || "CUSTOM", description: customDescription.trim() } : {}) }]);
    setModule(next);
    setHelpNodeId(null);
    return id;
  }, [match, customName, customDescription]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () => {
      const canvasBounds = canvas.getBoundingClientRect();
      const box = (id: string) => {
        const element = canvas.querySelector<HTMLElement>(`[data-graph-id="${id}"]`);
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left - canvasBounds.left, right: bounds.right - canvasBounds.left, top: bounds.top - canvasBounds.top, bottom: bounds.bottom - canvasBounds.top, cx: bounds.left + bounds.width / 2 - canvasBounds.left, cy: bounds.top + bounds.height / 2 - canvasBounds.top };
      };
      const edges = [...(showStarterGraph ? graphEdges : []), ...connections];
      const nextPaths = edges.flatMap(edge => {
        const from = box(edge.from);
        const to = box(edge.to);
        if (!from || !to) return [];
        const connectionId = "id" in edge ? edge.id : `${edge.from}-${edge.to}`;
        if ("fromAnchor" in edge && edge.fromAnchor && edge.toAnchor) {
          const start = { x: from.left + (from.right - from.left) * edge.fromAnchor.x / 100, y: from.top + (from.bottom - from.top) * edge.fromAnchor.y / 100 };
          const end = { x: to.left + (to.right - to.left) * edge.toAnchor.x / 100, y: to.top + (to.bottom - to.top) * edge.toAnchor.y / 100 };
          const outward = (side: NodeAnchor["side"]) => side === "left" ? { x: -1, y: 0 } : side === "right" ? { x: 1, y: 0 } : side === "top" ? { x: 0, y: -1 } : { x: 0, y: 1 };
          const fromDirection = outward(edge.fromAnchor.side);
          const toDirection = outward(edge.toAnchor.side);
          const startLead = { x: start.x + fromDirection.x * 10, y: start.y + fromDirection.y * 10 };
          const endLead = { x: end.x + toDirection.x * 10, y: end.y + toDirection.y * 10 };
          const fromHorizontal = fromDirection.x !== 0;
          const toHorizontal = toDirection.x !== 0;
          let middle: string;
          if (fromHorizontal && toHorizontal) middle = `H ${(startLead.x + endLead.x) / 2} V ${endLead.y} H ${endLead.x}`;
          else if (!fromHorizontal && !toHorizontal) middle = `V ${(startLead.y + endLead.y) / 2} H ${endLead.x} V ${endLead.y}`;
          else if (fromHorizontal) middle = `H ${endLead.x} V ${endLead.y}`;
          else middle = `V ${endLead.y} H ${endLead.x}`;
          const d = `M ${start.x} ${start.y} L ${startLead.x} ${startLead.y} ${middle} L ${end.x} ${end.y}`;
          return [{ id: connectionId, d }];
        }
        const vertical = "vertical" in edge && edge.vertical;
        const toRight = to.left >= from.right + 4;
        const toLeft = to.right <= from.left - 4;
        const toBelow = to.top >= from.bottom + 4;
        const toAbove = to.bottom <= from.top - 4;
        let d: string;
        if (!vertical && toRight) d = `M ${from.right} ${from.cy} H ${(from.right + to.left) / 2} V ${to.cy} H ${to.left}`;
        else if (!vertical && toLeft) d = `M ${from.left} ${from.cy} H ${(from.left + to.right) / 2} V ${to.cy} H ${to.right}`;
        else if (toBelow) d = `M ${from.cx} ${from.bottom} V ${(from.bottom + to.top) / 2} H ${to.cx} V ${to.top}`;
        else if (toAbove) d = `M ${from.cx} ${from.top} V ${(from.top + to.bottom) / 2} H ${to.cx} V ${to.bottom}`;
        else d = `M ${from.right} ${from.cy} H ${from.right + 14} V ${to.cy} H ${to.left}`;
        return [{ id: connectionId, d }];
      });
      setGraphSize({ width: canvasBounds.width, height: canvasBounds.height });
      setGraphPaths(nextPaths);
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    canvas.querySelectorAll<HTMLElement>(".demo-architecture-node,.demo-placed-node").forEach(node => observer.observe(node));
    const frame = window.requestAnimationFrame(update);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [placedComponents, connections, showStarterGraph]);

  useEffect(() => {
    if (!recentConnectionId) return;
    const timer = window.setTimeout(() => setRecentConnectionId(null), 620);
    return () => window.clearTimeout(timer);
  }, [recentConnectionId]);

  const showDragMotion = useCallback((next: Exclude<Module, null>, point: CanvasPoint) => {
    const workspace = workspaceRef.current;
    const canvas = canvasRef.current;
    if (!workspace || !canvas) return;
    const row = workspace.querySelector<HTMLElement>(`[data-demo-component="${next}"]`);
    const list = workspace.querySelector<HTMLElement>(".demo-palette-categories")?.getBoundingClientRect();
    const rowBounds = row?.getBoundingClientRect();
    const visibleRow = row && list && rowBounds && rowBounds.top >= list.top && rowBounds.bottom <= list.bottom ? row : null;
    const source = visibleRow ?? workspace.querySelector<HTMLElement>(".demo-more-components");
    if (!source) return;
    const frame = workspace.getBoundingClientRect();
    const from = source.getBoundingClientRect();
    const target = canvas.getBoundingClientRect();
    setDragMotion({ id: ++motionId.current, label: components.find(component => component.id === next)?.label ?? "COMPONENT", startX: from.left + from.width / 2 - frame.left, startY: from.top + from.height / 2 - frame.top, endX: target.left + target.width * point.x / 100 - frame.left, endY: target.top + target.height * point.y / 100 - frame.top });
  }, []);

  useEffect(() => {
    if (match) return;
    let disposed = false;
    const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
    const position = (element: HTMLElement): DemoPointer | null => {
      const workspace = workspaceRef.current?.getBoundingClientRect();
      if (!workspace) return null;
      const bounds = element.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2 - workspace.left, y: bounds.top + bounds.height / 2 - workspace.top, pressed: false };
    };
    const scrollListTo = async (list: HTMLElement, top: number) => {
      const target = Math.max(0, Math.min(list.scrollHeight - list.clientHeight, top));
      list.scrollTo({ top: target, behavior: "smooth" });
      const deadline = window.performance.now() + 1400;
      let settledFrames = 0;
      while (!disposed && settledFrames < 3 && window.performance.now() < deadline) {
        await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
        settledFrames = Math.abs(list.scrollTop - target) <= 1 ? settledFrames + 1 : 0;
      }
      // If the browser throttles smooth scrolling, snap to the measured destination
      // before the guide calculates the component row's click position.
      if (Math.abs(list.scrollTop - target) > 1) list.scrollTop = target;
      await sleep(60);
    };
    const pause = () => disposed || manualTicks.current > 0;
    async function animate() {
      await sleep(750);
      while (!disposed) {
        if (manualTicks.current > 0) {
          if (Number.isFinite(manualTicks.current)) manualTicks.current -= 1;
          setDemoPointer(null);
          setDragMotion(null);
          await sleep(1000);
          continue;
        }
        setManualOverride(false);
        // The canvas node layout switches at the landing demo container breakpoint,
        // so choose placement coordinates from that same width (not canvas width).
        const compact = (workspaceRef.current?.clientWidth ?? 1000) < 820;
        const next = sequence[(sequence.indexOf(activeModule.current) + 1) % sequence.length];
        const component = components.find(item => item.id === (next ?? activeModule.current));
        const category = component?.group === "EDGE" ? "NETWORKING" : component?.group === "DATA" ? "STORAGE" : component?.group;
        const list = workspaceRef.current?.querySelector<HTMLElement>(".demo-palette-categories");
        const header = category ? workspaceRef.current?.querySelector<HTMLElement>(`[data-demo-category="${category}"]`) : null;
        if (!list || !header) { await sleep(500); continue; }

        const wheel = position(list);
        if (wheel) setDemoPointer(wheel);
        await sleep(320);
        if (pause()) continue;
        const scrollTop = header.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 3;
        await scrollListTo(list, scrollTop);
        if (pause()) continue;
        const headerPoint = position(header);
        if (headerPoint) setDemoPointer(headerPoint);
        await sleep(400);
        if (pause()) continue;
        if (headerPoint) setDemoPointer({ ...headerPoint, pressed: true });
        setOpenCategory(category ?? null);
        await sleep(190);
        if (pause()) continue;
        if (headerPoint) setDemoPointer(headerPoint);
        await sleep(190);
        const row = workspaceRef.current?.querySelector<HTMLElement>(`[data-demo-component="${next ?? activeModule.current}"]`);
        if (!row) { await sleep(350); continue; }
        const rowBounds = row.getBoundingClientRect();
        const listBounds = list.getBoundingClientRect();
        if (rowBounds.bottom > listBounds.bottom || rowBounds.top < listBounds.top) {
          await scrollListTo(list, list.scrollTop + rowBounds.top - listBounds.top - 58);
        }
        if (pause()) continue;
        const rowPoint = position(row);
        if (rowPoint) setDemoPointer(rowPoint);
        await sleep(420);
        if (pause()) continue;
        if (rowPoint) setDemoPointer({ ...rowPoint, pressed: true });
        await sleep(170);
        if (pause()) continue;
        setDemoPointer(null);

        if (next) {
          const point = autoPositions[next][compact ? "mobile" : "desktop"];
          showDragMotion(next, point);
          await sleep(1080);
          if (pause()) continue;
          const id = placeModule(next, point);
          autoNodeIds.current.push(id);
          activeModule.current = next;
          await sleep(180);
          if (pause()) continue;
          const sourceId = next === "cdn" ? "dns" : next === "replica" ? "database" : "appB";
          const sourceNode = canvasRef.current?.querySelector<HTMLElement>(`[data-graph-id="${sourceId}"]`);
          const placedNode = canvasRef.current?.querySelector<HTMLElement>(`[data-graph-id="${id}"]`);
          const canvas = canvasRef.current?.getBoundingClientRect();
          const workspace = workspaceRef.current?.getBoundingClientRect();
          const sourceBounds = sourceNode?.getBoundingClientRect();
          const destinationBounds = placedNode?.getBoundingClientRect();
          if (canvas && workspace && sourceBounds && destinationBounds) {
            const toRight = destinationBounds.left >= sourceBounds.right + 4;
            const toLeft = destinationBounds.right <= sourceBounds.left - 4;
            const toBelow = destinationBounds.top >= sourceBounds.bottom + 4;
            const axis: "horizontal" | "vertical" = toRight || toLeft ? "horizontal" : "vertical";
            const sourceEdge = toRight ? { x: sourceBounds.right, y: sourceBounds.top + sourceBounds.height / 2 }
              : toLeft ? { x: sourceBounds.left, y: sourceBounds.top + sourceBounds.height / 2 }
              : toBelow ? { x: sourceBounds.left + sourceBounds.width / 2, y: sourceBounds.bottom }
              : { x: sourceBounds.left + sourceBounds.width / 2, y: sourceBounds.top };
            const destinationEdge = toRight ? { x: destinationBounds.left, y: destinationBounds.top + destinationBounds.height / 2 }
              : toLeft ? { x: destinationBounds.right, y: destinationBounds.top + destinationBounds.height / 2 }
              : toBelow ? { x: destinationBounds.left + destinationBounds.width / 2, y: destinationBounds.top }
              : { x: destinationBounds.left + destinationBounds.width / 2, y: destinationBounds.bottom };
            const toCanvasPoint = (point: { x: number; y: number }): CanvasPoint => ({ x: (point.x - canvas.left) / canvas.width * 100, y: (point.y - canvas.top) / canvas.height * 100 });
            const toWorkspacePoint = (point: { x: number; y: number }): DemoPointer => ({ x: point.x - workspace.left, y: point.y - workspace.top, pressed: false });
            const sourcePoint = toWorkspacePoint(sourceEdge);
            const destinationPoint = toWorkspacePoint(destinationEdge);
            const start = toCanvasPoint(sourceEdge);
            const end = toCanvasPoint(destinationEdge);
            setDemoPointer(sourcePoint);
            await sleep(260);
            if (pause()) continue;
            setDemoPointer({ ...sourcePoint, pressed: true });
            setDraftConnection({ from: sourceId, start, end, axis, progress: 0 });
            await sleep(90);
            for (let step = 1; step <= 10; step++) {
              const progress = step / 10;
              const cursor = pointOnRoute(sourceEdge, destinationEdge, axis, progress);
              setDemoPointer({ x: cursor.x - workspace.left, y: cursor.y - workspace.top, pressed: true });
              setDraftConnection({ from: sourceId, start, end, axis, progress });
              await sleep(40);
              if (pause()) break;
            }
            if (pause()) { setDraftConnection(null); continue; }
            const connectionId = `${sourceId}-${id}`;
            setRecentConnectionId(connectionId);
            setConnections(current => [...current, { id: connectionId, from: sourceId, to: id }]);
            setDraftConnection(null);
            setDemoPointer(destinationPoint);
            await sleep(180);
            setDemoPointer(null);
          }
          if (next === "cache" && !compact && !autoCommented.current) {
            autoCommented.current = true;
            manualTicks.current = 3;
            setAutoCommentText(desktopCommentText);
            setComments(current => [{ id: 0, x: compact ? 30 : 22, y: 68, text: "" }, ...current]);
            setDemoTyping(true);
          }
        } else {
          const removed = new Set(autoNodeIds.current);
          setPlacedComponents(current => current.filter(item => !removed.has(item.id)));
          setConnections(current => current.filter(item => !removed.has(item.to) && !removed.has(item.from)));
          autoNodeIds.current = [];
          activeModule.current = null;
          setModule(null);
          setHelpNodeId(null);
          autoCommented.current = false;
          autoArrowStarted.current = false;
          setComments(current => current.filter(comment => comment.id !== 0));
          setArrows(current => current.filter(arrow => arrow.id !== 0));
          setDemoTyping(false);
          setDemoDrawing(false);
        }
        await sleep(320);
        setDragMotion(null);
        await sleep(750);
      }
    }
    void animate();
    return () => { disposed = true; };
  }, [placeModule, showDragMotion, match]);

  // Demo: loops a 5:00 countdown. Match: counts down to the server's build deadline (falls back to counting up).
  useEffect(() => {
    if (match?.serverNow) clockOffset.current = match.serverNow - Date.now();
    const tick = () => {
      if (match && buildEndsAt) { setSecondsLeft(Math.max(0, Math.ceil((buildEndsAt - (Date.now() + clockOffset.current)) / 1000))); setClockSynced(true); }
      else setSecondsLeft(seconds => match ? seconds + 1 : seconds > 0 ? seconds - 1 : 300);
    };
    if (match && buildEndsAt) tick();
    const timer = window.setInterval(tick, match && buildEndsAt ? 250 : 1000);
    return () => window.clearInterval(timer);
  }, [match, buildEndsAt]);

  useEffect(() => {
    if (!demoTyping) return;
    const text = autoCommentText;
    let letters = 0;
    const timer = window.setInterval(() => {
      letters = Math.min(text.length, letters + 1);
      setComments(current => current.map(comment => comment.id === 0 ? { ...comment, text: text.slice(0, letters) } : comment));
      if (letters === text.length) {
        window.clearInterval(timer);
        setDemoTyping(false);
      }
    }, 48);
    return () => window.clearInterval(timer);
  }, [demoTyping, autoCommentText]);

  useEffect(() => {
    if (demoTyping || !autoCommented.current) return;
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current?.getBoundingClientRect();
      const comment = canvasRef.current?.querySelector<HTMLElement>("[data-demo-comment]")?.getBoundingClientRect();
      const target = canvasRef.current?.querySelector<HTMLElement>('[data-component-id="cache"]')?.getBoundingClientRect();
      if (!canvas || !comment || !target) return;
      const point = (x: number, y: number): CanvasPoint => ({ x: (x - canvas.left) / canvas.width * 100, y: (y - canvas.top) / canvas.height * 100 });
      const next = { id: 0, start: point(comment.right - 8, comment.top + 2), end: point(target.left + target.width / 2, target.bottom + 2) };
      setArrows(current => current.some(arrow => arrow.id === 0) ? current.map(arrow => arrow.id === 0 ? next : arrow) : [next, ...current]);
      if (!autoArrowStarted.current) {
        autoArrowStarted.current = true;
        setDemoDrawing(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [demoTyping, module, comments]);

  useEffect(() => {
    if (!demoDrawing) return;
    const timer = window.setTimeout(() => setDemoDrawing(false), 1050);
    return () => window.clearTimeout(timer);
  }, [demoDrawing]);

  function chooseModule(next: Exclude<Module, null>) {
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    setArmedComponent(next);
    setPlacementGhost(null);
    const group = components.find(component => component.id === next)?.group;
    if (group === "EDGE") setOpenCategory("NETWORKING");
    else if (group === "DATA") setOpenCategory("STORAGE");
    else if (group) setOpenCategory(group);
    setLibraryOpen(false);
  }

  function browseCategory(category: string) {
    manualTicks.current = 4;
    setManualOverride(true);
    setOpenCategory(current => current === category ? null : category);
  }

  function toggleDetails(id: string) {
    const next = helpNodeId === id ? null : id;
    setHelpNodeId(next);
    manualTicks.current = next ? Number.POSITIVE_INFINITY : 4;
    setManualOverride(Boolean(next));
  }

  function openCustom() {
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    setLibraryOpen(true);
    setCustomOpen(true);
  }

  function toggleLibrary() {
    const next = !libraryOpen;
    setLibraryOpen(next);
    setCustomOpen(false);
    manualTicks.current = next ? Number.POSITIVE_INFINITY : 4;
    setManualOverride(next);
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

  function anchorOnNode(node: HTMLElement, clientX: number, clientY: number): NodeAnchor {
    const bounds = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (clientX - bounds.left) / bounds.width * 100));
    const y = Math.max(0, Math.min(100, (clientY - bounds.top) / bounds.height * 100));
    const sides = [
      { side: "left" as const, distance: x },
      { side: "right" as const, distance: 100 - x },
      { side: "top" as const, distance: y * bounds.height / bounds.width },
      { side: "bottom" as const, distance: (100 - y) * bounds.height / bounds.width },
    ];
    const side = sides.reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest).side;
    return { x: side === "left" ? 0 : side === "right" ? 100 : x, y: side === "top" ? 0 : side === "bottom" ? 100 : y, side };
  }

  function addComment() {
    const text = commentDraft.trim();
    if (!text || !commentPosition) return;
    setComments(current => [...current, { id: match ? crypto.getRandomValues(new Uint32Array(1))[0] : nextAnnotationId.current++, ...commentPosition, text }].slice(-12));
    setCommentDraft("");
    setCommentPosition(null);
    manualTicks.current = detailsOpen ? Number.POSITIVE_INFINITY : 4;
  }

  function finishComment() {
    manualTicks.current = detailsOpen ? Number.POSITIVE_INFINITY : 4;
    if (cancelCommentRef.current) {
      cancelCommentRef.current = false;
      setCommentDraft("");
      setCommentPosition(null);
      return;
    }
    addComment();
    setCommentPosition(null);
  }

  function onCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (commentPosition || event.button !== 0) return;
    setSelectedNodeId(null);
    if (armedComponent) {
      placeModule(armedComponent, canvasPoint(event.clientX, event.clientY));
      setArmedComponent(null);
      setPlacementGhost(null);
      manualTicks.current = Number.POSITIVE_INFINITY;
      return;
    }
    const start = canvasPoint(event.clientX, event.clientY);
    const arrow = { id: match ? crypto.getRandomValues(new Uint32Array(1))[0] : nextAnnotationId.current++, start, end: start };
    canvasGesture.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, arrow };
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (movingNode.current?.pointerId === event.pointerId) {
      const { id, offsetX, offsetY, width, height } = movingNode.current;
      const point = canvasPoint(event.clientX - offsetX, event.clientY - offsetY);
      const canvas = canvasRef.current?.getBoundingClientRect();
      const insetX = canvas ? Math.min(50, width / canvas.width * 50) : 2;
      const insetY = canvas ? Math.min(50, height / canvas.height * 50) : 3;
      const bounded = { x: Math.max(insetX, Math.min(100 - insetX, point.x)), y: Math.max(insetY, Math.min(100 - insetY, point.y)) };
      setPlacedComponents(current => current.map(item => item.id === id ? { ...item, ...bounded } : item));
      return;
    }
    if (connectingFrom.current) {
      setDraftConnection(current => current ? { ...current, end: canvasPoint(event.clientX, event.clientY) } : null);
      return;
    }
    if (armedComponent) setPlacementGhost(canvasPoint(event.clientX, event.clientY));
    const gesture = canvasGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!drawingArrow.current && Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY) < 8) return;
    const arrow = { ...gesture.arrow, end: canvasPoint(event.clientX, event.clientY) };
    drawingArrow.current = arrow;
    setDraftArrow(arrow);
  }

  function onCanvasPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (movingNode.current?.pointerId === event.pointerId) {
      movingNode.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (connectingFrom.current) {
      const from = connectingFrom.current;
      const targetNode = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-graph-id]");
      const target = targetNode?.dataset.graphId;
      if (targetNode && target && target !== from.id) {
        const id = match ? `connection-${crypto.randomUUID()}` : `connection-${nextConnectionId.current++}`;
        setRecentConnectionId(id);
        setConnections(current => [...current, { id, from: from.id, to: target, fromAnchor: from.anchor, toAnchor: anchorOnNode(targetNode, event.clientX, event.clientY) }]);
      }
      connectingFrom.current = null;
      setDraftConnection(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const gesture = canvasGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (drawingArrow.current) {
      const end = canvasPoint(event.clientX, event.clientY);
      setArrows(current => [...current, { ...gesture.arrow, end }].slice(-12));
      manualTicks.current = detailsOpen ? Number.POSITIVE_INFINITY : 4;
    } else {
      setCommentPosition(canvasPoint(event.clientX, event.clientY, true));
    }
    canvasGesture.current = null;
    drawingArrow.current = null;
    setDraftArrow(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function beginNodeMove(event: PointerEvent<HTMLDivElement>, id: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(id);
    const bounds = event.currentTarget.getBoundingClientRect();
    movingNode.current = { id, pointerId: event.pointerId, offsetX: event.clientX - bounds.left - bounds.width / 2, offsetY: event.clientY - bounds.top - bounds.height / 2, width: bounds.width, height: bounds.height };
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function removePlacedNode(id: string) {
    setPlacedComponents(current => current.filter(item => item.id !== id));
    setConnections(current => current.filter(connection => connection.from !== id && connection.to !== id));
    setHelpNodeId(current => current === id ? null : current);
    setSelectedNodeId(current => current === id ? null : current);
  }

  function removeConnection(id: string) {
    setConnections(current => current.filter(connection => connection.id !== id));
  }

  function beginConnection(event: PointerEvent<HTMLElement>, id: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const node = event.currentTarget.closest<HTMLElement>("[data-graph-id]") ?? event.currentTarget;
    const anchor = anchorOnNode(node, event.clientX, event.clientY);
    const bounds = node.getBoundingClientRect();
    const start = canvasPoint(bounds.left + bounds.width * anchor.x / 100, bounds.top + bounds.height * anchor.y / 100);
    connectingFrom.current = { id, anchor };
    setDraftConnection({ from: id, start, end: start });
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function onCommentPointerDown(event: PointerEvent<HTMLDivElement>, id: number) {
    if (event.button !== 0) return;
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
    manualTicks.current = Number.POSITIVE_INFINITY;
    setManualOverride(true);
    setArmedComponent("custom");
  }

  function dragComponent(event: DragEvent<HTMLButtonElement>, id: Exclude<Module, null>) {
    event.dataTransfer.setData("application/x-systemwars-component", id);
    event.dataTransfer.effectAllowed = "copy";
  }

  function dropComponent(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-systemwars-component");
    if ((id === "custom" && customDescription.trim()) || components.some(component => component.id === id)) {
      manualTicks.current = Number.POSITIVE_INFINITY;
      setManualOverride(true);
      placeModule(id as Exclude<Module, null>, canvasPoint(event.clientX, event.clientY));
      setArmedComponent(null);
      setPlacementGhost(null);
      setLibraryOpen(false);
    }
  }

  // At 0:00 the staged canvas is submitted automatically. A half-built design still counts.
  const submitRef = useRef(submitMatchDesign);
  useEffect(() => { submitRef.current = submitMatchDesign; });
  useEffect(() => {
    if (!timeUp || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submitRef.current(true);
  }, [timeUp]);

  /** `auto` is used when the clock hits 0:00: the server accepts whatever is on the canvas, even half built. */
  async function submitMatchDesign(auto = false) {
    if (!match || (submitting && !auto)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!await flushCanvas() && !auto) { setSubmitError("Reconnect to save your canvas before submitting."); return; }
      const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto }),
      });
      const body = await response.json();
      // `closed` means the server already locked the team in after time ran out: the result is ready.
      if (!response.ok && !body.closed) { setSubmitError(body.error ?? "Could not submit the design."); return; }
      router.push(`/results?id=${encodeURIComponent(match.id)}`);
      router.refresh();
    } catch { setSubmitError("Could not submit the design."); }
    finally { setSubmitting(false); }
  }

  return <section className={`landing-demo ${match ? "match-live-demo" : ""} ${match ? `match-rank-${match.rankTone}` : ""} ${traffic ? "landing-demo-running" : ""}`} aria-label={match ? "Match architecture builder" : "Interactive architecture battle preview"}>
    <div className="landing-demo-body">
      <div className="demo-grid"/>
      <div className="demo-matchbar">
        {match ? <div className="demo-match-meta"><div className="demo-match-format"><span>{match.isNpc ? "AI CHALLENGE" : "RANKED"}</span><strong>{match.mode.toUpperCase()}</strong></div><div className="match-meta-actions">{!match.isNpc && <MatchVoiceChat matchId={match.id} userId={match.userId} mode={match.mode}/>} {brief && <button type="button" className="match-reference-toggle" aria-controls="match-reference-panel" aria-expanded={referenceOpen} onClick={() => setReferenceOpen(open => !open)}><BookOpen size={17}/> MATCH BRIEF</button>}<div className={`demo-match-time ${timeUp ? "match-time-up" : timeWarning ? "match-time-warning" : ""}`} role={counting ? "timer" : undefined} aria-label={counting ? `Build time left ${clock}` : undefined} title={counting ? "Auto-submits at 00:00" : undefined}><span aria-hidden="true"/>{buildEndsAt && !clockSynced ? "--:--" : timeUp ? "TIME" : clock}</div></div></div> : <div className="demo-match-meta demo-preview-meta"><div className="demo-preview-timer" role="timer" aria-label={`Demo build timer ${clock}`}><strong>{clock}</strong></div></div>}
        <div className="demo-match-player demo-match-you">{match ? <span className="demo-player-avatar-frame"><PlayerAvatar alt={`${match.handle}'s avatar`}/></span> : <span className="demo-player-avatar demo-player-initial">1</span>}<div className="demo-match-identity"><strong>{match ? match.handle.toUpperCase() : "PLAYER ONE"}</strong>{match && <span className="demo-rank"><b>{match.aiTeammates ? `YOUR TEAM + ${match.aiTeammates} AI` : "YOUR TEAM"}</b></span>}</div></div>
        {match && <div className="demo-versus-mark" aria-hidden="true"><span className="match-vs-label">VS</span></div>}
        <div className="demo-match-player demo-match-rival"><div className="demo-match-identity"><strong>{match ? (match.opponents.join(" · ") || "OPPONENT") : "PLAYER TWO"}</strong>{match && <span className="demo-rank"><b>OPPOSING SIDE</b></span>}</div>{match && match.opponentIds?.[0] ? <span className="demo-player-avatar-frame"><PlayerAvatar userId={match.opponentIds[0]} alt={`${match.opponents[0] ?? "Opponent"}'s avatar`}/></span> : <span className="demo-player-avatar demo-player-initial">{match ? match.opponents[0]?.slice(0, 1).toUpperCase() ?? "?" : "2"}</span>}</div>
      </div>
      <div ref={workspaceRef} className="demo-workspace">
      <div ref={canvasRef} className={`demo-drawing-surface ${armedComponent ? "demo-drawing-surface-placing" : ""}`} onDragOver={event => event.preventDefault()} onDrop={dropComponent} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={() => { canvasGesture.current = null; connectingFrom.current = null; movingNode.current = null; drawingArrow.current = null; setDraftArrow(null); setDraftConnection(null); manualTicks.current = Number.POSITIVE_INFINITY; }}>
        {match && placedComponents.length === 0 && <div className="match-live-empty" aria-hidden="true"><span>YOUR ARENA IS EMPTY</span><strong>BUILD YOUR SYSTEM</strong><small>Choose a component, place it here, and connect the pieces.</small></div>}
        <svg className="demo-graph-lines" viewBox={`0 0 ${graphSize.width} ${graphSize.height}`} preserveAspectRatio="none" aria-hidden="true"><defs><marker id="demo-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z" fill="#e9ebec"/></marker></defs>{graphPaths.map((edge, index) => <g key={edge.id}><path className={`demo-graph-path ${edge.id === recentConnectionId ? "demo-graph-path-connecting" : ""}`} d={edge.d} pathLength={100} markerEnd={edge.id === recentConnectionId ? undefined : "url(#demo-graph-arrow)"}/>{traffic && edge.id !== recentConnectionId && <circle className="demo-graph-packet" r="2.5"><animateMotion dur={`${2 + index * .12}s`} begin={`${index * .17}s`} repeatCount="indefinite" path={edge.d}/></circle>}</g>)}{draftConnection && (draftConnection.axis ? <path className="demo-graph-draft" pathLength={100} fill="none" style={{ strokeDasharray: 100, strokeDashoffset: 100 * (1 - (draftConnection.progress ?? 1)) }} d={(() => { const start = { x: graphSize.width * draftConnection.start.x / 100, y: graphSize.height * draftConnection.start.y / 100 }; const end = { x: graphSize.width * draftConnection.end.x / 100, y: graphSize.height * draftConnection.end.y / 100 }; return draftConnection.axis === "horizontal" ? `M ${start.x} ${start.y} H ${(start.x + end.x) / 2} V ${end.y} H ${end.x}` : `M ${start.x} ${start.y} V ${(start.y + end.y) / 2} H ${end.x} V ${end.y}`; })()}/> : <line className="demo-graph-draft" x1={graphSize.width * draftConnection.start.x / 100} y1={graphSize.height * draftConnection.start.y / 100} x2={graphSize.width * draftConnection.end.x / 100} y2={graphSize.height * draftConnection.end.y / 100}/>)}</svg>
        <div className="demo-architecture" aria-label={match ? `${match.scenario} architecture` : "Ticketing system architecture"}>{showStarterGraph && graphNodes.map(item => { const Icon = item.icon; return <div className="demo-node demo-architecture-node" data-graph-id={item.id} key={item.id} onPointerDown={event => beginConnection(event, item.id)} title={`Drag to connect ${item.label}`}><Icon size={21}/><strong>{item.label}</strong></div>; })}</div>
        {placedComponents.map(item => { const component = item.componentId === "custom" ? customComponent : components.find(candidate => candidate.id === item.componentId); if (!component) return null; const Icon = component.icon; const name = item.name ?? component.label; return <div className={`demo-node demo-placed-node ${selectedNodeId === item.id ? "demo-placed-node-selected" : ""}`} data-graph-id={item.id} data-component-id={item.componentId} key={item.id} style={{ left: `${item.x}%`, top: `${item.y}%` }} onPointerDown={event => beginNodeMove(event, item.id)} title={`Drag ${name} to move it`}><Icon size={19}/><strong>{name}</strong><button type="button" className="demo-node-remove" aria-label={`Remove ${name}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); removePlacedNode(item.id); }}><X size={12}/></button><button type="button" className="demo-node-port" aria-label={`Connect ${name} to another component`} onPointerDown={event => beginConnection(event, item.id)}/><button type="button" className="demo-component-help" aria-label={`What does ${name} do?`} aria-expanded={helpNodeId === item.id} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); toggleDetails(item.id); }}>?</button>{helpNodeId === item.id && <div className="demo-node-note"><p>{item.description ?? component.reason}</p></div>}</div>; })}
        {armedComponent && placementGhost && <div className="demo-placement-ghost" style={{ left: `${placementGhost.x}%`, top: `${placementGhost.y}%` }}>{armedComponent === "custom" ? customComponent.label : components.find(component => component.id === armedComponent)?.label}</div>}
        <svg className="demo-annotation-arrows" aria-hidden="true"><defs><marker id="demo-arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L8 4.5 L1 8 Z" fill="#f0f1f2"/></marker></defs>{[...arrows, ...(draftArrow ? [draftArrow] : [])].map(arrow => <line key={arrow.id} className={arrow.id === 0 ? "demo-auto-arrow" : undefined} pathLength={100} x1={`${arrow.start.x}%`} y1={`${arrow.start.y}%`} x2={`${arrow.end.x}%`} y2={`${arrow.end.y}%`} markerEnd={arrow.id === 0 && demoDrawing ? undefined : "url(#demo-arrowhead)"}/>)}</svg>
        {demoDrawing && autoArrow && <MousePointer2 className="demo-annotation-cursor" style={{ "--arrow-start-x": `${autoArrow.start.x}%`, "--arrow-start-y": `${autoArrow.start.y}%`, "--arrow-end-x": `${autoArrow.end.x}%`, "--arrow-end-y": `${autoArrow.end.y}%` } as CSSProperties} size={20} fill="currentColor" strokeWidth={1.2} aria-hidden="true"/>}
        {comments.map(comment => <div key={comment.id} data-demo-comment={comment.id === 0 ? "" : undefined} className={`demo-canvas-comment ${comment.id === 0 && demoTyping ? "demo-canvas-comment-typing" : ""}`} style={{ left: `${comment.x}%`, top: `${comment.y}%` }} onPointerDown={event => onCommentPointerDown(event, comment.id)} onClick={event => event.stopPropagation()}><p>{comment.text}</p>{comment.id === 0 && demoTyping && <MousePointer2 className="demo-comment-writing-pointer" size={17} fill="currentColor" strokeWidth={1.2} aria-hidden="true"/>}</div>)}
        {commentPosition && <textarea className="demo-canvas-comment-editor" style={{ left: `${commentPosition.x}%`, top: `${commentPosition.y}%` }} value={commentDraft} onChange={event => setCommentDraft(event.target.value)} onBlur={finishComment} onKeyDown={event => { if (event.key === "Escape") { cancelCommentRef.current = true; event.currentTarget.blur(); } else if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); } }} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} maxLength={120} placeholder="Type a note..." aria-label="Comment on your design" autoFocus rows={2}/>}
      </div>
      {!manualOverride && !demoTyping && !demoDrawing && dragMotion && <div className="demo-drag-cursor" key={dragMotion.id} style={{ "--drag-start-x": `${dragMotion.startX}px`, "--drag-start-y": `${dragMotion.startY}px`, "--drag-end-x": `${dragMotion.endX}px`, "--drag-end-y": `${dragMotion.endY}px` } as CSSProperties} aria-hidden="true"><span>{dragMotion.label}</span><MousePointer2 size={25} fill="currentColor" strokeWidth={1.4}/></div>}
      {!manualOverride && demoPointer && <div className={`demo-interaction-pointer ${demoPointer.pressed ? "demo-interaction-pointer-pressed" : ""} ${draftConnection?.axis ? "demo-interaction-pointer-connecting" : ""}`} style={{ "--pointer-x": `${demoPointer.x}px`, "--pointer-y": `${demoPointer.y}px` } as CSSProperties} aria-hidden="true"><MousePointer2 size={22} fill="currentColor" strokeWidth={1.3}/><i/></div>}
      <div className="demo-controls">
        <div className="demo-side-head">Components{match && <span>{placedComponents.length} PLACED</span>}</div>
        {match && placedComponents.length + comments.length + arrows.length > 0 && <section className="demo-placed-menu" aria-label="Items on the board"><button type="button" className="demo-placed-menu-toggle" aria-expanded={placedMenuOpen} onClick={() => setPlacedMenuOpen(open => !open)}><span>ON THE BOARD</span><small>{placedComponents.length} NODES · {connections.length} LINKS</small><ChevronDown size={16}/></button>{placedMenuOpen && <div className="demo-placed-menu-list">{placedComponents.length > 0 && <div className="demo-placed-menu-group">COMPONENTS</div>}{placedComponents.map((item, index) => <div className={`demo-placed-menu-row ${selectedNodeId === item.id ? "demo-placed-menu-row-selected" : ""}`} key={item.id}><button type="button" className="demo-placed-menu-select" aria-pressed={selectedNodeId === item.id} onClick={() => setSelectedNodeId(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{nodeLabel(item.id)}</button><button type="button" className="demo-placed-menu-remove" aria-label={`Remove ${nodeLabel(item.id)} from the board`} onClick={() => removePlacedNode(item.id)}><X size={15}/></button></div>)}{connections.length > 0 && <><div className="demo-placed-menu-group">CONNECTIONS</div>{connections.map(connection => <div className="demo-placed-menu-row" key={connection.id}><span className="demo-placed-menu-connection">{nodeLabel(connection.from)} <b>→</b> {nodeLabel(connection.to)}</span><button type="button" className="demo-placed-menu-remove" aria-label={`Remove connection from ${nodeLabel(connection.from)} to ${nodeLabel(connection.to)}`} onClick={() => removeConnection(connection.id)}><X size={15}/></button></div>)}</>}{comments.length > 0 && <><div className="demo-placed-menu-group">NOTES</div>{comments.map((comment, index) => <div className="demo-placed-menu-row" key={comment.id}><span className="demo-placed-menu-connection">{comment.text || `Note ${index + 1}`}</span><button type="button" className="demo-placed-menu-remove" aria-label={`Remove note ${index + 1}`} onClick={() => setComments(current => current.filter(item => item.id !== comment.id))}><X size={15}/></button></div>)}</>}{arrows.length > 0 && <><div className="demo-placed-menu-group">ARROWS</div>{arrows.map((arrow, index) => <div className="demo-placed-menu-row" key={arrow.id}><span className="demo-placed-menu-connection">Arrow {String(index + 1).padStart(2, "0")}</span><button type="button" className="demo-placed-menu-remove" aria-label={`Remove arrow ${index + 1}`} onClick={() => setArrows(current => current.filter(item => item.id !== arrow.id))}><X size={15}/></button></div>)}</>}</div>}</section>}
        <div className="demo-palette-categories" onWheel={() => { manualTicks.current = 4; setManualOverride(true); }} onTouchStart={() => { manualTicks.current = 4; setManualOverride(true); }}>
          {paletteCategories.map(category => <div className="demo-palette-category" key={category.label}><button type="button" className="demo-category-toggle" data-demo-category={category.label} aria-expanded={openCategory === category.label} onClick={() => browseCategory(category.label)}><span>{category.title}</span><ChevronDown size={16}/></button>{openCategory === category.label && <div className="demo-category-items">{category.ids.map(id => { const component = components.find(item => item.id === id)!; const Icon = component.icon; return <button type="button" key={component.id} data-demo-component={component.id} draggable onDragStart={event => dragComponent(event, component.id)} onClick={() => chooseModule(component.id)}><Icon size={19}/><span>{componentDisplayNames[component.id]}</span></button>; })}</div>}</div>)}
          <button className="demo-palette-custom" type="button" onClick={openCustom}><PencilLine size={18}/><span>Custom component</span><ArrowRight size={16}/></button>
        </div>
        <button className="demo-more-components" type="button" aria-label="Browse components" aria-expanded={libraryOpen} onClick={toggleLibrary}><Search size={16}/><span>All components</span></button>
        {libraryOpen && <div className={`demo-component-library ${customOpen ? "demo-component-library-custom" : ""}`}><div className="demo-library-head"><strong>{customOpen ? "CREATE A COMPONENT" : "COMPONENT LIBRARY"}</strong>{!customOpen && <span>{components.length + 1} TYPES</span>}<button type="button" aria-label="Close component library" onClick={toggleLibrary}><X size={17}/></button></div>{!customOpen && <label className="demo-library-search"><Search size={15}/><input value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)} placeholder="Search components" aria-label="Search components"/></label>}
          {customOpen ? <div className="demo-custom-editor"><label htmlFor="demo-custom-name">COMPONENT NAME</label><input id="demo-custom-name" value={customName} onChange={event => setCustomName(event.target.value)} maxLength={20} placeholder="e.g. Fraud check" autoFocus/><label htmlFor="demo-custom-description">WHAT IT DOES</label><textarea id="demo-custom-description" value={customDescription} onChange={event => setCustomDescription(event.target.value)} maxLength={100} placeholder="e.g. Validate each checkout event" rows={3}/><div><button type="button" onClick={() => { setCustomOpen(false); manualTicks.current = Number.POSITIVE_INFINITY; }}>BACK</button><button type="button" disabled={!customName.trim() || !customDescription.trim()} onClick={saveCustom}>ADD TO CANVAS <ArrowRight size={14}/></button></div></div> : <div className="demo-library-layout"><nav className="demo-library-groups" aria-label="Component categories">{["ALL", ...groups].map(group => <button type="button" key={group} aria-current={libraryGroup === group ? "true" : undefined} onClick={() => setLibraryGroup(group)}>{group}</button>)}</nav><div className="demo-library-content"><div className="demo-library-section-title"><span>{libraryGroup === "ALL" ? "ALL COMPONENTS" : libraryGroup}</span><small>DRAG OR CLICK TO PLACE</small></div><div className="demo-library-items">{filteredComponents.map(component => { const Icon = component.icon; return <button type="button" key={component.id} draggable onDragStart={event => dragComponent(event, component.id)} onClick={() => chooseModule(component.id)}><Icon size={22}/><span>{component.label}</span></button>; })}</div><button className="demo-library-custom" type="button" onClick={openCustom}><PencilLine size={18}/><span>CREATE CUSTOM COMPONENT</span><ArrowRight size={15}/></button></div></div>}
        </div>}
      </div>
      {match && brief && referenceOpen && <aside id="match-reference-panel" className="match-reference" aria-label="Scenario requirements"><header className="match-reference-heading"><h2>MATCH BRIEF</h2><button type="button" onClick={() => setReferenceOpen(false)} aria-label="Close match brief"><X size={22}/></button></header><section className="match-reference-scale"><span>SCALE</span><strong>{brief.scale}</strong></section><dl className="match-reference-metrics"><div><dt>TRAFFIC</dt><dd>{brief.throughput}</dd></div><div><dt>PERFORMANCE</dt><dd>{brief.latency}</dd></div></dl><section className="match-reference-list"><h3>REQUIREMENTS</h3><ul>{brief.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></section></aside>}
      </div>
    </div>
    <div className="landing-demo-bottom">{!match && <><span className="demo-traffic-state"><i/>{traffic ? "TRAFFIC FLOWING" : "TRAFFIC PAUSED"}</span><button type="button" onClick={() => setTraffic(!traffic)}><Play size={15} fill="currentColor"/>{traffic ? "PAUSE TRAFFIC" : "SEND TRAFFIC"}</button></>}{match && <><span className="match-canvas-state" role="status">{matchCanvasStatus}</span><button type="button" className="match-live-submit" disabled={submitting || timeUp || Boolean(syncError) || !submitReady} onClick={() => void submitMatchDesign()}>{submitting ? "SUBMITTING" : "SUBMIT DESIGN"} <ArrowRight size={17}/></button></>}</div>{submitError && <p className="match-live-error" role="alert">{submitError}</p>}
  </section>;
}
