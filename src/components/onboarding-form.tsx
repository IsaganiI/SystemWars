"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, Swords, UsersRound } from "lucide-react";
import type { Mode } from "@/lib/game-types";

const formats = [
  { id: "1v1", name: "DUEL", detail: "One player per side", icon: Swords },
  { id: "2v2", name: "DUOS", detail: "Two players per side", icon: UsersRound },
  { id: "3v3", name: "SQUADS", detail: "Three players per side", icon: Shield },
] as const;

export function OnboardingForm({ handle }: { handle: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("1v1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferredMode: mode }) });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? "Could not save your format.");
        return;
      }
      router.push("/play");
      router.refresh();
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell onboarding-shell"><div className="auth-top"><span className="wordmark"><span className="wordmark-crest">SW</span><span>System</span><strong>Wars</strong></span><span className="onboarding-user">{handle.toUpperCase()}</span></div><div className="onboarding-content"><span className="page-kicker">PLAYER SETUP / 02 OF 02</span><h1>Choose your<br/><span>format.</span></h1><p>Set your default queue. You can switch formats in the lobby.</p><div className="onboarding-formats" role="group" aria-label="Starting match format">{formats.map(format => { const Icon = format.icon; return <button type="button" key={format.id} aria-pressed={mode === format.id} onClick={() => setMode(format.id)} className={`onboarding-format ${mode === format.id ? "onboarding-format-active" : ""}`}><Icon size={28}/><strong>{format.id}</strong><span>{format.name}</span><small>{format.detail}</small></button>; })}</div>{error && <p className="auth-error" role="alert">{error}</p>}<button type="button" className="auth-submit onboarding-submit" onClick={finish} disabled={busy}>{busy ? "SAVING" : "ENTER LOBBY"}<ArrowRight size={19}/></button></div></main>;
}
