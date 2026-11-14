import { Swords } from "lucide-react";
import { Brand } from "@/components/brand";

export default function Loading() {
  return <main className="play-loading" aria-label="Loading Play">
    <header className="play-loading-top"><Brand/><span>PLAY</span></header>
    <div className="play-loading-stage" role="status" aria-live="polite">
      <div className="play-loading-route play-loading-route-left" aria-hidden="true"/>
      <div className="play-loading-route play-loading-route-right" aria-hidden="true"/>
      <div className="play-loading-orbit" aria-hidden="true"><div><Swords size={42} strokeWidth={1.4}/></div></div>
      <span>LOADING PLAY</span>
    </div>
  </main>;
}
