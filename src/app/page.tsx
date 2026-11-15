import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LandingDemo } from "@/components/landing-demo";
import { Brand } from "@/components/brand";
import { LandingEnterButton } from "@/components/landing-enter-button";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(getPlayerProfile(session.user.id) ? "/play" : "/onboarding");
  return <main className="landing-shell"><header className="landing-header"><Link href="/" className="wordmark"><Brand/></Link><nav className="landing-nav"><Link href="/login" className="landing-nav-login">SIGN IN</Link><Link href="/register" className="landing-nav-join">JOIN <ArrowRight size={16}/></Link></nav></header><section className="landing-stage"><div className="landing-art" aria-hidden="true"/><div className="landing-versus-sigil" aria-hidden="true"><span>VS</span></div><div className="landing-content"><h1 className="landing-headline"><span className="landing-headline-key">system design</span><span className="landing-headline-finish" data-text="BATTLES">battles</span></h1><div className="landing-entry"><LandingEnterButton/></div></div><LandingDemo/></section></main>;
}
