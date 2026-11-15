import type { VetoScenario } from "@/lib/veto-scenarios";

export type MatchBrief = {
  name: string;
  situation: string;
  scale: string;
  throughput: string;
  latency: string;
  requirements: string[];
};

export const matchBriefs: Record<VetoScenario, MatchBrief> = {
  "ticket-onsale": {
    name: "Ticket Onsale",
    situation: "A global concert goes on sale at the same instant for everyone. Fans surge in, seats are scarce, and checkout must stay trustworthy under the rush.",
    scale: "1.2M fans in the opening minute",
    throughput: "100K checkout attempts / min",
    latency: "P95 browse response under 300ms",
    requirements: ["Absorb the opening traffic spike", "Prevent overselling and duplicate purchases", "Keep checkout and inventory consistent", "Recover cleanly when a service fails"],
  },
  "live-chat": {
    name: "Live Chat",
    situation: "A live event sends a huge audience into thousands of chat rooms at once. Messages must arrive quickly, stay in order, and survive disconnects.",
    scale: "500K concurrent connections",
    throughput: "50K messages / sec",
    latency: "P95 delivery under 150ms",
    requirements: ["Keep real-time connections stable", "Fan messages out to active rooms", "Preserve ordering within each room", "Store history and handle reconnects"],
  },
  "video-streaming": {
    name: "Video Streaming",
    situation: "Creators launch live streams to a worldwide audience. Viewers on different networks need a smooth start and uninterrupted playback as demand surges.",
    scale: "2M concurrent viewers",
    throughput: "500 simultaneous live channels",
    latency: "Playback start under 2 seconds",
    requirements: ["Ingest and transcode live video", "Deliver adaptive streams worldwide", "Avoid a single origin bottleneck", "Keep playback resilient during spikes"],
  },
};
