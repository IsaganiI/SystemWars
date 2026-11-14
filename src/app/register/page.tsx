import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(getPlayerProfile(session.user.id) ? "/play" : "/onboarding");
  return <AuthScreen mode="register"/>;
}
