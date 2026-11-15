import type { VetoScenario } from "@/lib/veto-scenarios";
import type { Architecture } from "@/lib/scoring";

const systems: Record<VetoScenario, { kinds: string[]; title: string }> = {
  "ticket-onsale": { title: "Queue First Checkout", kinds: ["cdn", "queue", "database", "app", "worker"] },
  "live-chat": { title: "Room Fanout", kinds: ["websocket", "pubsub", "stream", "database"] },
  "video-streaming": { title: "Regional Live Delivery", kinds: ["transcoder", "storage", "cdn", "balancer"] },
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
