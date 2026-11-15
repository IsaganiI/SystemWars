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
  "flash-sale": {
    name: "Flash Sale",
    situation: "A limited-edition drop opens worldwide and bots race real shoppers for a small inventory. The storefront must stay responsive while every purchase remains fair and accurate.",
    scale: "4M shoppers in 90 seconds",
    throughput: "80K purchase attempts / sec",
    latency: "P95 product page under 250ms",
    requirements: ["Absorb a sudden global traffic spike", "Limit bots without blocking real shoppers", "Reserve each item only once", "Keep checkout responsive as inventory runs low"],
  },
  "ride-dispatch": {
    name: "Ride Dispatch",
    situation: "A citywide event ends at once, flooding a ride app with pickup requests. Drivers move between zones, and riders need a quick, nearby match with reliable trip updates.",
    scale: "300K riders across 40K city zones",
    throughput: "25K location updates / sec",
    latency: "Driver match under 2 seconds",
    requirements: ["Match riders to nearby available drivers", "Handle constantly changing locations", "Prevent duplicate driver assignments", "Keep trip updates live through reconnects"],
  },
  "cloud-drive": {
    name: "Cloud Drive",
    situation: "A workday starts across several continents and teams open, edit, and share the same files. Changes should sync quickly while permissions and file history remain dependable.",
    scale: "8M active users",
    throughput: "120K file changes / sec",
    latency: "P95 metadata sync under 400ms",
    requirements: ["Sync changes across regions", "Resolve simultaneous edits safely", "Keep file metadata searchable", "Protect versions and recover deleted files"],
  },
  "global-search": {
    name: "Global Search",
    situation: "A worldwide catalog grows by the minute while shoppers expect typo-tolerant results and fresh updates. Search must stay fast across regions as indexes are rebuilt and traffic surges.",
    scale: "180M indexed documents",
    throughput: "140K queries / sec",
    latency: "P95 search under 120ms",
    requirements: ["Ingest catalog changes continuously", "Return relevant results and suggestions quickly", "Keep indexes available across regions", "Rebuild or roll back a damaged index safely"],
  },
  "game-state": {
    name: "Game State",
    situation: "A global multiplayer launch puts millions of players into live matches. Inputs must reach the authoritative game state quickly, stay consistent for every player, and recover when a game server drops.",
    scale: "2.4M concurrent players",
    throughput: "110K player actions / sec",
    latency: "P99 state update under 50ms",
    requirements: ["Keep match state authoritative", "Broadcast state changes to the right players", "Recover matches after a server failure", "Persist snapshots without slowing live play"],
  },
  "social-feed": {
    name: "Social Feed",
    situation: "A major creator posts during a live event and millions of followers open their feeds at once. Feed updates must feel fresh, stay relevant, and avoid one popular account overwhelming the system.",
    scale: "35M daily active users",
    throughput: "240K feed reads / sec",
    latency: "P95 feed load under 220ms",
    requirements: ["Serve feeds quickly from nearby regions", "Handle high-follower posts without hot partitions", "Rank and paginate fresh content", "Keep feed reads available during write spikes"],
  },
};
