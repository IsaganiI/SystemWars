"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function PlayerAvatar({ className = "", alt = "Player avatar", userId }: { className?: string; alt?: string; userId?: string }) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion(Date.now());
    window.addEventListener("player-avatar-updated", refresh);
    return () => window.removeEventListener("player-avatar-updated", refresh);
  }, []);
  return <Image className={className} src={`/api/profile/avatar${userId ? `?userId=${encodeURIComponent(userId)}&` : "?"}v=${version}`} alt={alt} fill sizes="128px" unoptimized onError={(event) => { event.currentTarget.src = "/default-avatar.svg"; event.currentTarget.srcset = ""; }} />;
}
