export type Mode = "1v1" | "2v2" | "3v3";
export type Rank = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster" | "Architect";

export const rankRanges: { name: Rank; min: number; max: number | null; subtitle: string }[] = [
  { name: "Bronze", min: 0, max: 999, subtitle: "Localhost" },
  { name: "Silver", min: 1000, max: 1299, subtitle: "Load Balanced" },
  { name: "Gold", min: 1300, max: 1599, subtitle: "Replicated" },
  { name: "Platinum", min: 1600, max: 1899, subtitle: "Sharded" },
  { name: "Diamond", min: 1900, max: 2099, subtitle: "Multi-Region" },
  { name: "Master", min: 2100, max: 2299, subtitle: "Five Nines" },
  { name: "Grandmaster", min: 2300, max: 2449, subtitle: "Zero Downtime" },
  { name: "Architect", min: 2450, max: null, subtitle: "Architect" },
];

export function rankForRating(rating: number): Rank {
  return [...rankRanges].reverse().find(rank => rating >= rank.min)?.name ?? "Bronze";
}

export const leaderboardPlayers: {
  handle: string;
  ratings: Record<Mode, number>;
  wins: number;
  losses: number;
  streak: string;
}[] = [
  { handle: "distributed.dev", ratings: { "1v1": 2675, "2v2": 2510, "3v3": 2380 }, wins: 85, losses: 22, streak: "W5" },
  { handle: "cachemiss", ratings: { "1v1": 2550, "2v2": 2290, "3v3": 2485 }, wins: 76, losses: 29, streak: "W3" },
  { handle: "seqfault", ratings: { "1v1": 2470, "2v2": 2420, "3v3": 2250 }, wins: 68, losses: 28, streak: "W2" },
  { handle: "tailcall", ratings: { "1v1": 2410, "2v2": 2530, "3v3": 2310 }, wins: 59, losses: 26, streak: "L1" },
  { handle: "heapsort", ratings: { "1v1": 2342, "2v2": 2385, "3v3": 2215 }, wins: 64, losses: 31, streak: "W4" },
  { handle: "graphlord", ratings: { "1v1": 2265, "2v2": 2150, "3v3": 2190 }, wins: 55, losses: 29, streak: "W1" },
  { handle: "nodezero", ratings: { "1v1": 2182, "2v2": 2065, "3v3": 2120 }, wins: 47, losses: 32, streak: "L2" },
  { handle: "shardqueen", ratings: { "1v1": 2040, "2v2": 2240, "3v3": 2085 }, wins: 42, losses: 30, streak: "W2" },
  { handle: "dist.sys", ratings: { "1v1": 1988, "2v2": 1950, "3v3": 2010 }, wins: 35, losses: 27, streak: "L1" },
  { handle: "ARCHITECT_01", ratings: { "1v1": 1965, "2v2": 1785, "3v3": 1510 }, wins: 18, losses: 11, streak: "W1" },
  { handle: "eventloop", ratings: { "1v1": 1834, "2v2": 1880, "3v3": 1905 }, wins: 34, losses: 33, streak: "W1" },
  { handle: "readreplica", ratings: { "1v1": 1700, "2v2": 1630, "3v3": 1750 }, wins: 26, losses: 24, streak: "L1" },
];

export type MatchRecord = {
  id: string;
  result: "W" | "L";
  opponent: string;
  challenge: string;
  mode: Mode;
  playedAt: string;
  change: number;
  served: string;
  latency: string;
  availability: string;
};

export const matchHistory: MatchRecord[] = [
  { id: "SW-008", result: "W", opponent: "cachemiss", challenge: "Ticket onsale", mode: "1v1", playedAt: "NOV 13", change: 31, served: "98.7%", latency: "184 ms", availability: "99.9%" },
  { id: "SW-007", result: "L", opponent: "nodezero", challenge: "Design a CDN", mode: "2v2", playedAt: "NOV 12", change: -18, served: "91.2%", latency: "232 ms", availability: "97.8%" },
  { id: "SW-006", result: "W", opponent: "graphlord", challenge: "Live chat", mode: "3v3", playedAt: "NOV 12", change: 26, served: "99.1%", latency: "146 ms", availability: "99.9%" },
  { id: "SW-005", result: "W", opponent: "dist.sys", challenge: "File storage", mode: "1v1", playedAt: "NOV 11", change: 24, served: "96.4%", latency: "201 ms", availability: "99.5%" },
  { id: "SW-004", result: "L", opponent: "tailcall", challenge: "Realtime feed", mode: "1v1", playedAt: "NOV 10", change: -21, served: "88.9%", latency: "278 ms", availability: "96.1%" },
  { id: "SW-003", result: "W", opponent: "eventloop", challenge: "Video upload", mode: "2v2", playedAt: "NOV 09", change: 28, served: "97.5%", latency: "192 ms", availability: "99.8%" },
  { id: "SW-002", result: "W", opponent: "readreplica", challenge: "Search index", mode: "3v3", playedAt: "NOV 08", change: 22, served: "95.1%", latency: "214 ms", availability: "99.4%" },
  { id: "SW-001", result: "L", opponent: "heapsort", challenge: "Payment gateway", mode: "1v1", playedAt: "NOV 07", change: -16, served: "90.6%", latency: "241 ms", availability: "98.7%" },
];
