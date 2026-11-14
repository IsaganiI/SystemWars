import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LandingDemo } from "@/components/landing-demo";
import { Brand } from "@/components/brand";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(getPlayerProfile(session.user.id) ? "/play" : "/onboarding");
  return <main className="landing-shell"><header className="landing-header"><Link href="/" className="wordmark"><Brand/></Link><nav className="landing-nav"><Link href="/login" className="landing-nav-login">SIGN IN</Link><Link href="/register" className="landing-nav-join">JOIN <ArrowRight size={16}/></Link></nav></header><section className="landing-stage"><div className="landing-art" aria-hidden="true"/><div className="landing-content"><h1 className="landing-headline"><span className="landing-headline-intro">Competitive</span><span className="landing-headline-key">system design</span><span className="landing-headline-finish" data-text="BATTLES">battles</span></h1><div className="landing-entry"><Link href="/register" className="landing-enter"><span>START PLAYING</span><span className="landing-enter-action"><ArrowRight size={22}/></span></Link><p>Already have an account? <Link href="/login">Sign in</Link></p></div></div><LandingDemo/><div className="landing-corner">BUILD · TEST · COMPETE</div></section></main>;
}
