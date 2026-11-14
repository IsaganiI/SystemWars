import { Activity, Boxes, Crown, Database, Globe2, Network, Server, Triangle } from "lucide-react";
import type { Rank } from "@/lib/demo-data";

const icons = {
  Bronze: Server,
  Silver: Network,
  Gold: Database,
  Platinum: Boxes,
  Diamond: Globe2,
  Master: Activity,
  Grandmaster: Crown,
  Architect: Triangle,
};

export function RankBadge({ rank, size = "regular" }: { rank: Rank; size?: "regular" | "large" }) {
  const Icon = icons[rank];
  return <span className={`rank-badge rank-badge-${rank.toLowerCase()} ${size === "large" ? "rank-badge-large" : ""}`} role="img" aria-label={`${rank} rank`}>
    <span className="rank-badge-core"><Icon aria-hidden="true" strokeWidth={2.2}/></span>
  </span>;
}
