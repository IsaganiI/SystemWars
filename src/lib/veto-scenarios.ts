export type ScenarioDifficulty = "easy" | "standard" | "hard";

export const vetoScenarios = [
  { id: "ticket-onsale", name: "Ticket Onsale", difficulty: "easy" },
  { id: "live-chat", name: "Live Chat", difficulty: "easy" },
  { id: "video-streaming", name: "Video Streaming", difficulty: "standard" },
  { id: "flash-sale", name: "Flash Sale", difficulty: "hard" },
  { id: "ride-dispatch", name: "Ride Dispatch", difficulty: "hard" },
  { id: "cloud-drive", name: "Cloud Drive", difficulty: "standard" },
  { id: "global-search", name: "Global Search", difficulty: "standard" },
  { id: "game-state", name: "Game State", difficulty: "hard" },
  { id: "social-feed", name: "Social Feed", difficulty: "easy" },
] as const;

export type VetoScenario = typeof vetoScenarios[number]["id"];

export function difficultyForRating(rating: number): ScenarioDifficulty {
  if (rating < 1200) return "easy";
  if (rating < 1600) return "standard";
  return "hard";
}

export function difficultyForScenario(id: string): ScenarioDifficulty {
  return vetoScenarios.find(scenario => scenario.id === id)?.difficulty ?? "standard";
}

/** Stable per-match shuffle keeps both players' veto boards in the same randomized order. */
export function scenariosForMatch(matchId: string, required: readonly VetoScenario[] = [], difficulty: ScenarioDifficulty = "easy") {
  let seed = 2166136261;
  for (const char of matchId) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const scenarios = vetoScenarios.filter(scenario => scenario.difficulty === difficulty);
  for (let index = scenarios.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [scenarios[index], scenarios[target]] = [scenarios[target], scenarios[index]];
  }
  const pinned = [...new Set(required)].filter(id => vetoScenarios.some(scenario => scenario.id === id)).slice(0, 3);
  return [...pinned, ...scenarios.filter(scenario => !pinned.includes(scenario.id))].slice(0, 3);
}
