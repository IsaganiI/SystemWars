export type CanvasPoint = { x: number; y: number };
export type SharedNode = CanvasPoint & { id: string; componentId: string; name?: string; description?: string };
export type SharedEdge = { id: string; from: string; to: string; fromAnchor?: CanvasPoint & { side: string }; toAnchor?: CanvasPoint & { side: string } };
export type SharedNote = CanvasPoint & { id: number; text: string };
export type SharedStroke = { id: number; start: CanvasPoint; end: CanvasPoint };
export type SharedCanvas = { nodes: SharedNode[]; edges: SharedEdge[]; notes: SharedNote[]; strokes: SharedStroke[] };
export type CanvasCollection = keyof SharedCanvas;
export type CanvasOperation = { collection: CanvasCollection; action: "upsert"; item: SharedNode | SharedEdge | SharedNote | SharedStroke } | { collection: CanvasCollection; action: "remove"; id: string | number };

export const emptyCanvas = (): SharedCanvas => ({ nodes: [], edges: [], notes: [], strokes: [] });

const componentIds = new Set(["dns", "cdn", "gateway", "balancer", "waf", "websocket", "app", "worker", "function", "container", "payment", "transcoder", "scheduler", "cache", "database", "nosql", "replica", "storage", "search", "queue", "stream", "pubsub", "limiter", "auth", "breaker", "metrics", "logs", "custom"]);
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const id = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 80;
const number = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const point = (value: unknown): value is CanvasPoint & Record<string, unknown> => object(value) && typeof value.x === "number" && Number.isFinite(value.x) && value.x >= 0 && value.x <= 100 && typeof value.y === "number" && Number.isFinite(value.y) && value.y >= 0 && value.y <= 100;
const anchor = (value: unknown) => value === undefined || point(value) && object(value) && ["left", "right", "top", "bottom"].includes(String(value.side));

function validItem(collection: CanvasCollection, item: unknown): boolean {
  if (!object(item)) return false;
  if (collection === "nodes") return id(item.id) && point(item) && typeof item.componentId === "string" && componentIds.has(item.componentId)
    && (item.name === undefined || typeof item.name === "string" && item.name.length <= 50)
    && (item.description === undefined || typeof item.description === "string" && item.description.length <= 140);
  if (collection === "edges") return id(item.id) && id(item.from) && id(item.to) && item.from !== item.to && anchor(item.fromAnchor) && anchor(item.toAnchor);
  if (collection === "notes") return number(item.id) && point(item) && typeof item.text === "string" && item.text.length <= 200;
  return number(item.id) && point(item.start) && point(item.end);
}

export function parseCanvasOperations(value: unknown): CanvasOperation[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const result: CanvasOperation[] = [];
  for (const entry of value) {
    if (!object(entry) || !["nodes", "edges", "notes", "strokes"].includes(String(entry.collection))) return null;
    const collection = entry.collection as CanvasCollection;
    if (entry.action === "remove" && (collection === "nodes" || collection === "edges" ? id(entry.id) : number(entry.id))) result.push({ collection, action: "remove", id: entry.id as string | number });
    else if (entry.action === "upsert" && validItem(collection, entry.item)) result.push({ collection, action: "upsert", item: entry.item as SharedNode | SharedEdge | SharedNote | SharedStroke });
    else return null;
  }
  return result;
}

export function applyCanvasOperations(canvas: SharedCanvas, operations: CanvasOperation[]): SharedCanvas | null {
  const next: SharedCanvas = { nodes: [...canvas.nodes], edges: [...canvas.edges], notes: [...canvas.notes], strokes: [...canvas.strokes] };
  for (const operation of operations) {
    const collection = operation.collection;
    if (collection === "nodes") {
      if (operation.action === "remove") {
        next.nodes = next.nodes.filter(item => item.id !== operation.id);
        next.edges = next.edges.filter(item => item.from !== operation.id && item.to !== operation.id);
      } else {
        const item = operation.item as SharedNode;
        next.nodes = [...next.nodes.filter(node => node.id !== item.id), item];
      }
    } else if (collection === "edges") {
      if (operation.action === "remove") next.edges = next.edges.filter(item => item.id !== operation.id);
      else {
        const item = operation.item as SharedEdge;
        next.edges = [...next.edges.filter(edge => edge.id !== item.id), item];
      }
    } else if (collection === "notes") {
      if (operation.action === "remove") next.notes = next.notes.filter(item => item.id !== operation.id);
      else {
        const item = operation.item as SharedNote;
        next.notes = [...next.notes.filter(note => note.id !== item.id), item];
      }
    } else if (operation.action === "remove") next.strokes = next.strokes.filter(item => item.id !== operation.id);
    else {
      const item = operation.item as SharedStroke;
      next.strokes = [...next.strokes.filter(stroke => stroke.id !== item.id), item];
    }
  }
  if (next.nodes.length > 80 || next.edges.length > 160 || next.notes.length > 30 || next.strokes.length > 80) return null;
  const nodeIds = new Set(next.nodes.map(node => node.id));
  next.edges = next.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return next;
}

export function diffCanvas(before: SharedCanvas, after: SharedCanvas): CanvasOperation[] {
  const operations: CanvasOperation[] = [];
  for (const collection of ["nodes", "edges", "notes", "strokes"] as const) {
    const oldItems = new Map(before[collection].map(item => [item.id, JSON.stringify(item)]));
    const newItems = new Map(after[collection].map(item => [item.id, JSON.stringify(item)]));
    for (const item of after[collection]) if (oldItems.get(item.id) !== newItems.get(item.id)) operations.push({ collection, action: "upsert", item });
    for (const item of before[collection]) if (!newItems.has(item.id)) operations.push({ collection, action: "remove", id: item.id });
  }
  return operations;
}
