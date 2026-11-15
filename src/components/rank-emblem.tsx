import Image from "next/image";
import type { CSSProperties } from "react";
import { rankName, rankTone } from "@/lib/rank-tone";

export function RankEmblem({ rating, size = 36, className = "" }: { rating: number | undefined; size?: number; className?: string }) {
  const tone = rankTone(rating);
  return <span style={{ "--rank-emblem-size": `${size}px` } as CSSProperties} className={`rank-emblem rank-emblem-${tone} ${className}`.trim()} role="img" aria-label={`${rankName(rating)} rank`}>
    <Image src={`/ranks/${tone}.svg`} alt="" width={size} height={size} sizes={`${size}px`} unoptimized/>
  </span>;
}
