"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function PlayerAvatar({ className = "", alt = "Player avatar" }: { className?: string; alt?: string }) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion(Date.now());
    window.addEventListener("player-avatar-updated", refresh);
    return () => window.removeEventListener("player-avatar-updated", refresh);
  }, []);
  return <Image className={className} src={`/api/profile/avatar?v=${version}`} alt={alt} fill sizes="128px" unoptimized/>;
}
