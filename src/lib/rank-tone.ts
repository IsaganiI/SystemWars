export function rankTone(rating: number | undefined) {
  if (rating === undefined) return "unranked";
  if (rating < 1000) return "bronze";
  if (rating < 1200) return "silver";
  if (rating < 1400) return "gold";
  if (rating < 1600) return "platinum";
  if (rating < 1800) return "diamond";
  if (rating < 2000) return "master";
  return "grandmaster";
}

export function rankName(rating: number | undefined) {
  return rankTone(rating).toUpperCase();
}
