import { GameRail, GameTopbar } from "@/components/game-navigation";
import { GameGuide } from "@/components/game-guide";

export default function AboutPage() {
  return <main className="game-shell"><GameRail active="about"/><div className="game-main"><GameTopbar active="about"/><GameGuide/></div></main>;
}
