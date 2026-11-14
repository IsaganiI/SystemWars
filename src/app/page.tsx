import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { LandingDemo } from "@/components/landing-demo";
import { auth } from "@/lib/auth";
import { getPlayerProfile } from "@/lib/db";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(getPlayerProfile(session.user.id) ? "/play" : "/onboarding");
  return <main className="landing-shell"><header className="landing-header"><Link href="/" className="wordmark"><span className="wordmark-crest">SW</span><span>System</span><strong>Wars</strong></Link><nav className="landing-nav"><Link href="/about" className="landing-nav-about"><BookOpen size={16}/> THE GAME</Link><Link href="/login" className="landing-nav-login">SIGN IN</Link><Link href="/register" className="landing-nav-join">JOIN <ArrowRight size={16}/></Link></nav></header><section className="landing-stage"><div className="landing-art" aria-hidden="true"/><div className="landing-content"><h1>System<br/><span>Wars.</span></h1><p className="landing-subtitle">Competitive system design</p><div className="landing-rule"/><div className="landing-actions"><Link href="/register">CREATE ACCOUNT <ArrowRight size={21}/></Link><Link href="/login">SIGN IN</Link></div></div><LandingDemo/><div className="landing-corner">BUILD · TEST · COMPETE</div></section></main>;
}
