import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerDirectory } from "@/components/player-directory";
import { auth } from "@/lib/auth";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ add?: string | string[] }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Invite links look like /players?add=SW-XXXX-XXXX-XXXX. The code is only pre-filled; the player still presses send.
  const add = (await searchParams).add;
  const sharedCode = typeof add === "string" ? add.slice(0, 40) : undefined;
  return <PlayerDirectory userId={session.user.id} handle={session.user.displayUsername ?? session.user.username ?? session.user.name} sharedCode={sharedCode}/>;
}
