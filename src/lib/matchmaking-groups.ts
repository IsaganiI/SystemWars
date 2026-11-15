export type MatchGroup = { group_id: string; queued_at: number; size: number; rating: number };

/** Select a full lobby and assign whole parties to equally sized teams. */
export function selectMatchGroups(groups: MatchGroup[], teamSize: number, now: number) {
  const validGroups = groups.filter(group => group.size > 0 && group.size <= teamSize);
  for (const seed of validGroups) {
    const ratingWindow = Math.min(1200, 200 + Math.floor((now - seed.queued_at) / 15000) * 100);
    const candidates = validGroups.filter(group => Math.abs(group.rating - seed.rating) <= ratingWindow)
      .sort((a, b) => Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) || a.queued_at - b.queued_at);
    let examined = 0;

    const assign = (picked: MatchGroup[]) => {
      let best: number[] | null = null;
      let bestGap = Number.POSITIVE_INFINITY;
      const place = (index: number, counts: number[], totals: number[], teams: number[]) => {
        if (index === picked.length) {
          if (counts[0] !== teamSize || counts[1] !== teamSize) return;
          const gap = Math.abs(totals[0] / teamSize - totals[1] / teamSize);
          if (gap < bestGap) { bestGap = gap; best = [...teams]; }
          return;
        }
        const party = picked[index];
        for (const team of [0, 1]) {
          if (counts[team] + party.size > teamSize) continue;
          counts[team] += party.size;
          totals[team] += party.rating * party.size;
          teams[index] = team;
          place(index + 1, counts, totals, teams);
          counts[team] -= party.size;
          totals[team] -= party.rating * party.size;
        }
      };
      place(0, [0, 0], [0, 0], []);
      return best;
    };

    const choose = (start: number, slots: number, picked: MatchGroup[]): { groups: MatchGroup[]; assignment: number[] } | null => {
      if (slots === teamSize * 2) {
        const assignment = assign(picked);
        return assignment ? { groups: picked, assignment } : null;
      }
      if (slots > teamSize * 2 || examined++ > 20000) return null;
      for (let index = start; index < candidates.length; index++) {
        const candidate = candidates[index];
        if (slots + candidate.size > teamSize * 2) continue;
        const result = choose(index + 1, slots + candidate.size, [...picked, candidate]);
        if (result) return result;
      }
      return null;
    };

    const result = choose(0, 0, []);
    if (result) return result;
  }
  return null;
}
