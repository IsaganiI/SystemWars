"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/brand";

export function LandingEnterButton() {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function launch(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (launching) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/register");
      return;
    }
    setLaunching(true);
    timer.current = window.setTimeout(() => router.push("/register"), 420);
  }

  return <Link href="/register" onClick={launch} aria-busy={launching} className={`landing-enter ${launching ? "landing-enter-launching" : ""}`}>
    <span className="landing-enter-crest" aria-hidden="true"><BrandIcon/></span>
    <span className="landing-enter-label" aria-live="polite">{launching ? "FIGHT!" : "ENTER THE ARENA"}</span>
    <span className="landing-enter-action" aria-hidden="true"><ArrowRight size={23}/></span>
  </Link>;
}
