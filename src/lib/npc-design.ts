import type { VetoScenario } from "@/lib/veto-scenarios";
import type { Architecture } from "@/lib/scoring";

const systems: Record<VetoScenario, { kinds: string[]; title: string }> = {
  "ticket-onsale": { title: "Queue First Checkout", kinds: ["cdn", "queue", "database", "app", "worker"] },
  "live-chat": { title: "Room Fanout", kinds: ["websocket", "pubsub", "stream", "database"] },
  "video-streaming": { title: "Regional Live Delivery", kinds: ["transcoder", "storage", "cdn", "balancer"] },
  "flash-sale": { title: "Fair Queue Checkout", kinds: ["cdn", "limiter", "queue", "worker", "payment", "database"] },
  "ride-dispatch": { title: "Live City Dispatch", kinds: ["gateway", "websocket", "search", "pubsub", "queue", "database"] },
  "cloud-drive": { title: "Global File Sync", kinds: ["cdn", "websocket", "queue", "worker", "storage", "search", "replica"] },
  "global-search": { title: "Distributed Search Index", kinds: ["gateway", "limiter", "queue", "worker", "search", "replica", "cache"] },
  "game-state": { title: "Authoritative Match State", kinds: ["balancer", "gateway", "websocket", "app", "pubsub", "cache", "storage"] },
  "social-feed": { title: "Regional Fanout Feed", kinds: ["cdn", "cache", "pubsub", "queue", "worker", "database", "replica"] },
};

export function npcDesign(scenario: VetoScenario): Architecture & { notes: []; strokes: [] } {
  const kinds = systems[scenario].kinds;
  return {
    nodes: kinds.map((kind, index) => ({ id: `npc-${index}`, kind, name: kind.replaceAll("-", " ").toUpperCase(),
      x: 70 + index * (640 / Math.max(1, kinds.length - 1)), y: index % 2 ? 315 : 225 })),
    edges: kinds.slice(1).map((_, index) => ({ from: `npc-${index}`, to: `npc-${index + 1}` })),
    notes: [], strokes: [],
  };
}
