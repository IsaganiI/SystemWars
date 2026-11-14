import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LobbyPage from "@/components/lobby-page";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function PlayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  if (!getPlayerProfile(session.user.id)) redirect("/onboarding");
  const playerHandle = session.user.displayUsername ?? session.user.username ?? session.user.name;
  return <LobbyPage playerHandle={playerHandle} userId={session.user.id}/>;
}
