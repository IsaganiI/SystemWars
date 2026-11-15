import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerDirectory } from "@/components/player-directory";
import { auth } from "@/lib/auth";

export default async function PlayersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <PlayerDirectory userId={session.user.id} handle={session.user.displayUsername ?? session.user.username ?? session.user.name}/>;
}
