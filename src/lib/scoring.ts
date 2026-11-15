import type { VetoScenario } from "@/lib/veto-scenarios";

export type Architecture = {
  nodes: { id: string; kind: string }[];
  edges: { from: string; to: string }[];
};

type Kinds = readonly string[];
type Route = readonly [Kinds, Kinds];
type Metric = { label: string; groups: readonly [Kinds, Kinds]; routes: readonly [Route, Route] };
export type ScoreBreakdown = { label: string; earned: number; possible: number }[];

// Each challenge has five design metrics worth 20 points. Component choices earn
// 4 points per group; plausible connections between those components earn 6.
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
};

export function scoreArchitecture(scenario: VetoScenario, design: Architecture): { score: number; breakdown: ScoreBreakdown } {
  const nodes = new Map(design.nodes.map(node => [node.id, node.kind]));
  const neighbors = new Map([...nodes.keys()].map(id => [id, new Set<string>()]));
  const connectedKinds = new Set<string>();
  for (const edge of design.edges) {
    if (edge.from === edge.to || !nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    neighbors.get(edge.from)!.add(edge.to);
    connectedKinds.add(nodes.get(edge.from)!);
    connectedKinds.add(nodes.get(edge.to)!);
  }
  const byKind = (options: Kinds) => [...nodes].filter(([, kind]) => options.includes(kind)).map(([id]) => id);
  const hasRoute = ([fromKinds, toKinds]: Route) => {
    const targets = new Set(byKind(toKinds));
    const visited = new Set<string>();
    let frontier = byKind(fromKinds);
    for (let hops = 0; hops <= 3 && frontier.length; hops++) {
      if (hops > 0 && frontier.some(id => targets.has(id))) return true;
      const next: string[] = [];
      for (const id of frontier) {
        if (visited.has(id)) continue;
        visited.add(id);
        for (const neighbor of neighbors.get(id) ?? []) if (!visited.has(neighbor)) next.push(neighbor);
      }
      frontier = next;
    }
    return false;
  };
  const breakdown: ScoreBreakdown = metrics[scenario].map(metric => ({
    label: metric.label,
    earned: metric.groups.reduce((points, group) => points + (group.some(kind => connectedKinds.has(kind)) ? 4 : 0), 0)
      + metric.routes.reduce((points, route) => points + (hasRoute(route) ? 6 : 0), 0),
    possible: 20,
  }));
  return { score: breakdown.reduce((total, metric) => total + metric.earned, 0), breakdown };
}
