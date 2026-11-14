import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LobbyPage from "@/components/lobby-page";
import { auth } from "@/lib/auth";
import { db, getPlayerProfile } from "@/lib/db";
import type { Mode } from "@/lib/game-types";

type RatingRow = { mode: Mode; rating: number };

export default async function PlayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  if (!getPlayerProfile(session.user.id)) redirect("/onboarding");
  const playerHandle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  const rows = db.prepare("SELECT mode, rating FROM player_rating WHERE user_id = ?").all(session.user.id) as RatingRow[];
  const ratings = Object.fromEntries(rows.map(row => [row.mode, row.rating])) as Partial<Record<Mode, number>>;
  return <LobbyPage playerHandle={playerHandle} userId={session.user.id} ratings={ratings}/>;
}
