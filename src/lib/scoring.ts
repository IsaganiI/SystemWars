import type { VetoScenario } from "@/lib/veto-scenarios";

export type Architecture = {
  nodes: { id: string; kind: string }[];
  edges: { from: string; to: string }[];
};

type Kinds = readonly string[];
type Route = readonly [Kinds, Kinds];
type Metric = { label: string; groups: readonly [Kinds, Kinds]; routes: readonly [Route, Route] };
export type ScoreBreakdown = { label: string; earned: number; possible: number }[];

// Five challenge-specific metrics are worth 16 points each. Coverage earns
// 3 points per component group; route quality earns up to 5 per flow.
const metrics: Record<VetoScenario, readonly Metric[]> = {
  "ticket-onsale": [
    { label: "Scalability", groups: [["cdn", "balancer"], ["cache", "limiter"]], routes: [[["cdn", "balancer"], ["app"]], [["queue"], ["worker"]]] },
    { label: "Checkout throughput", groups: [["queue", "stream"], ["worker"]], routes: [[["app"], ["queue", "stream"]], [["queue", "stream"], ["worker"]]] },
    { label: "Inventory integrity", groups: [["database"], ["queue", "stream"]], routes: [[["app"], ["database"]], [["queue", "stream"], ["database"]]] },
    { label: "Failure recovery", groups: [["replica", "breaker"], ["worker", "queue"]], routes: [[["database"], ["replica"]], [["queue"], ["worker"]]] },
    { label: "Payment flow", groups: [["payment"], ["app"]], routes: [[["app"], ["payment"]], [["app"], ["database"]]] },
  ],
  "live-chat": [
    { label: "Connection scale", groups: [["websocket"], ["balancer"]], routes: [[["balancer"], ["websocket"]], [["balancer"], ["app"]]] },
    { label: "Fanout throughput", groups: [["pubsub"], ["stream", "queue"]], routes: [[["websocket"], ["pubsub"]], [["pubsub"], ["stream", "queue"]]] },
    { label: "Delivery speed design", groups: [["websocket"], ["cache"]], routes: [[["websocket"], ["pubsub"]], [["pubsub"], ["stream"]]] },
    { label: "Room ordering", groups: [["stream", "queue"], ["database", "nosql"]], routes: [[["pubsub"], ["stream", "queue"]], [["stream", "queue"], ["database", "nosql"]]] },
    { label: "History & recovery", groups: [["database", "nosql"], ["replica", "storage"]], routes: [[["stream", "queue"], ["database", "nosql"]], [["database", "nosql"], ["replica", "storage"]]] },
  ],
  "video-streaming": [
    { label: "Viewer scale", groups: [["cdn"], ["balancer"]], routes: [[["storage"], ["cdn"]], [["cdn"], ["balancer"]]] },
    { label: "Ingest throughput", groups: [["transcoder"], ["storage"]], routes: [[["transcoder"], ["storage"]], [["storage"], ["cdn"]]] },
    { label: "Playback start design", groups: [["cdn"], ["cache"]], routes: [[["storage"], ["cdn"]], [["cdn"], ["balancer", "cache"]]] },
    { label: "Playback resilience", groups: [["storage", "replica"], ["queue", "breaker"]], routes: [[["storage"], ["replica"]], [["transcoder"], ["queue"]]] },
    { label: "Global delivery", groups: [["transcoder"], ["cdn"]], routes: [[["transcoder"], ["storage"]], [["storage"], ["cdn"]]] },
  ],
  "flash-sale": [
    { label: "Traffic surge", groups: [["cdn", "balancer"], ["cache", "limiter"]], routes: [[ ["cdn", "balancer"], ["app"]], [["limiter"], ["app"]]] },
    { label: "Fair access", groups: [["limiter", "waf"], ["auth"]], routes: [[ ["waf", "limiter"], ["app"]], [["auth"], ["app"]]] },
    { label: "Inventory integrity", groups: [["database"], ["queue", "stream"]], routes: [[ ["app"], ["database"]], [["queue", "stream"], ["database"]]] },
    { label: "Checkout throughput", groups: [["queue", "stream"], ["worker"]], routes: [[ ["app"], ["queue", "stream"]], [["queue", "stream"], ["worker"]]] },
    { label: "Purchase completion", groups: [["payment"], ["breaker", "replica"]], routes: [[ ["app"], ["payment"]], [["database"], ["replica"]]] },
  ],
  "ride-dispatch": [
    { label: "Location intake", groups: [["websocket", "gateway"], ["balancer"]], routes: [[ ["gateway", "balancer"], ["app"]], [["websocket"], ["app"]]] },
    { label: "Nearby matching", groups: [["nosql", "search"], ["cache"]], routes: [[ ["app"], ["search", "nosql"]], [["search", "nosql"], ["cache"]]] },
    { label: "Live trip updates", groups: [["pubsub", "stream"], ["websocket"]], routes: [[ ["app"], ["pubsub", "stream"]], [["pubsub", "stream"], ["websocket"]]] },
    { label: "Driver assignment", groups: [["database"], ["queue"]], routes: [[ ["app"], ["database"]], [["queue"], ["worker"]]] },
    { label: "City resilience", groups: [["balancer", "breaker"], ["replica", "cache"]], routes: [[ ["app"], ["breaker"]], [["database"], ["replica"]]] },
  ],
  "cloud-drive": [
    { label: "Global sync", groups: [["cdn", "balancer"], ["gateway", "websocket"]], routes: [[ ["cdn", "balancer"], ["app"]], [["app"], ["websocket"]]] },
    { label: "Concurrent edits", groups: [["queue", "stream"], ["database", "nosql"]], routes: [[ ["app"], ["queue", "stream"]], [["queue", "stream"], ["database", "nosql"]]] },
    { label: "File storage", groups: [["storage"], ["database"]], routes: [[ ["app"], ["storage"]], [["app"], ["database"]]] },
    { label: "Search & metadata", groups: [["search"], ["worker"]], routes: [[ ["database", "nosql"], ["search"]], [["queue"], ["worker"]]] },
    { label: "Version recovery", groups: [["replica", "storage"], ["breaker", "queue"]], routes: [[ ["storage"], ["replica"]], [["queue"], ["worker"]]] },
  ],
  "global-search": [
    { label: "Query scale", groups: [["balancer", "gateway"], ["cache", "limiter"]], routes: [[ ["gateway", "balancer"], ["app"]], [["app"], ["cache"]]] },
    { label: "Index ingestion", groups: [["queue", "stream"], ["worker"]], routes: [[ ["app"], ["queue", "stream"]], [["queue", "stream"], ["worker"]]] },
    { label: "Fast relevant results", groups: [["search"], ["cache"]], routes: [[ ["app"], ["search"]], [["search"], ["cache"]]] },
    { label: "Regional availability", groups: [["replica", "storage"], ["balancer", "breaker"]], routes: [[ ["search"], ["replica"]], [["app"], ["breaker"]]] },
    { label: "Safe index rebuilds", groups: [["worker"], ["storage", "replica"]], routes: [[ ["queue"], ["worker"]], [["worker"], ["storage"]]] },
  ],
  "game-state": [
    { label: "Player connections", groups: [["gateway", "balancer"], ["websocket"]], routes: [[ ["gateway", "balancer"], ["websocket"]], [["websocket"], ["app"]]] },
    { label: "Authoritative simulation", groups: [["app", "container"], ["cache"]], routes: [[ ["websocket"], ["app", "container"]], [["app", "container"], ["cache"]]] },
    { label: "State fanout", groups: [["pubsub", "stream"], ["websocket"]], routes: [[ ["app"], ["pubsub", "stream"]], [["pubsub", "stream"], ["websocket"]]] },
    { label: "Match recovery", groups: [["breaker", "balancer"], ["replica", "storage"]], routes: [[ ["app"], ["breaker"]], [["storage"], ["replica"]]] },
    { label: "Durable snapshots", groups: [["storage", "database"], ["queue", "worker"]], routes: [[ ["app"], ["queue", "worker"]], [["worker"], ["storage", "database"]]] },
  ],
  "social-feed": [
    { label: "Fast feed reads", groups: [["cdn", "balancer"], ["cache"]], routes: [[ ["cdn", "balancer"], ["app"]], [["app"], ["cache"]]] },
    { label: "Post fanout", groups: [["pubsub", "stream"], ["queue", "worker"]], routes: [[ ["app"], ["pubsub", "stream"]], [["queue"], ["worker"]]] },
    { label: "Hot creator posts", groups: [["limiter", "cache"], ["queue", "stream"]], routes: [[ ["app"], ["limiter"]], [["app"], ["queue", "stream"]]] },
    { label: "Fresh ranked pages", groups: [["search", "database", "nosql"], ["cache"]], routes: [[ ["worker"], ["search", "database", "nosql"]], [["search", "database", "nosql"], ["cache"]]] },
    { label: "Regional reliability", groups: [["replica", "breaker"], ["storage", "database"]], routes: [[ ["database"], ["replica"]], [["app"], ["breaker"]]] },
  ],
};

export function scoreArchitecture(scenario: VetoScenario, design: Architecture): { score: number; breakdown: ScoreBreakdown } {
  const nodes = new Map<string, string>();
  for (const node of design.nodes) if (node.id && !nodes.has(node.id)) nodes.set(node.id, node.kind);
  const neighbors = new Map([...nodes.keys()].map(id => [id, new Set<string>()]));
  const reverse = new Map([...nodes.keys()].map(id => [id, new Set<string>()]));
  const undirected = new Map([...nodes.keys()].map(id => [id, new Set<string>()]));
  const connectedKinds = new Set<string>();
  for (const edge of design.edges) {
    if (edge.from === edge.to || !nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    neighbors.get(edge.from)!.add(edge.to);
    reverse.get(edge.to)!.add(edge.from);
    undirected.get(edge.from)!.add(edge.to);
    undirected.get(edge.to)!.add(edge.from);
    connectedKinds.add(nodes.get(edge.from)!);
    connectedKinds.add(nodes.get(edge.to)!);
  }
  const byKind = (options: Kinds) => [...nodes].filter(([, kind]) => options.includes(kind)).map(([id]) => id);
  const routeDistance = ([fromKinds, toKinds]: Route) => {
    const targets = new Set(byKind(toKinds));
    const queue: [string, number][] = byKind(fromKinds).map(id => [id, 0]);
    const visited = new Set(queue.map(([id]) => id));
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const [id, distance] = queue[cursor];
      if (distance > 0 && targets.has(id)) return distance;
      for (const next of neighbors.get(id) ?? []) {
        if (!visited.has(next)) { visited.add(next); queue.push([next, distance + 1]); }
      }
    }
    return Infinity;
  };
  const breakdown: ScoreBreakdown = metrics[scenario].map(metric => ({
    label: metric.label,
    earned: metric.groups.reduce((points, group) => points + (group.some(kind => connectedKinds.has(kind)) ? 3 : 0), 0)
      + metric.routes.reduce((points, route) => {
        const hops = routeDistance(route);
        return points + (hops === 1 ? 5 : hops === 2 ? 3 : hops === 3 ? 1 : 0);
      }, 0),
    possible: 16,
  }));

  // The final 20 points assess the architecture as a whole, so adding lots of
  // disconnected boxes or a single fragile path cannot match a clean design.
  const ids = [...nodes.keys()];
  const seen = new Set<string>();
  let largestComponent = 0;
  for (const start of ids) {
    if (seen.has(start)) continue;
    let size = 0;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const id = stack.pop()!;
      size++;
      for (const next of undirected.get(id) ?? []) if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
    largestComponent = Math.max(largestComponent, size);
  }
  const ingressKinds: Kinds = ["cdn", "gateway", "balancer", "waf", "limiter", "websocket"];
  const terminalKinds: Kinds = ["app", "worker", "function", "database", "nosql", "storage", "search", "queue", "payment", "cache", "pubsub", "stream"];
  const walk = (starts: string[], graph: Map<string, Set<string>>) => {
    const reached = new Set(starts);
    const stack = [...starts];
    while (stack.length) for (const next of graph.get(stack.pop()!) ?? []) if (!reached.has(next)) { reached.add(next); stack.push(next); }
    return reached;
  };
  const forward = walk(byKind(ingressKinds), neighbors);
  const backward = walk(byKind(terminalKinds), reverse);
  const meaningfulFlow = ids.filter(id => forward.has(id) && backward.has(id)).length;
  const redundancyKinds: Kinds = ["app", "worker", "balancer", "websocket", "database", "nosql", "storage"];
  const hasRedundantService = redundancyKinds.some(kind => byKind([kind]).filter(id => connectedKinds.has(kind) && (neighbors.get(id)!.size + reverse.get(id)!.size > 0)).length >= 2);
  const hasRecoveryControl = byKind(["replica"]).some(id => neighbors.get(id)!.size + reverse.get(id)!.size > 0)
    || byKind(["breaker"]).some(id => neighbors.get(id)!.size + reverse.get(id)!.size > 0);
  breakdown.push(
    { label: "Architecture cohesion", earned: ids.length ? Math.round(8 * largestComponent / ids.length) : 0, possible: 8 },
    { label: "End-to-end flow", earned: ids.length ? Math.round(6 * meaningfulFlow / ids.length) : 0, possible: 6 },
    { label: "Resilience & redundancy", earned: (hasRedundantService ? 3 : 0) + (hasRecoveryControl ? 3 : 0), possible: 6 },
  );
  return { score: breakdown.reduce((total, metric) => total + metric.earned, 0), breakdown };
}
