import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/register");
  if (getPlayerProfile(session.user.id)) redirect("/play");
  return <OnboardingForm handle={session.user.name}/>;
}
