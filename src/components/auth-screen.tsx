"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand } from "@/components/brand";

export function AuthScreen({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (register && !/^[A-Za-z0-9_]{3,20}$/.test(handle)) {
      setError("Use 3–20 letters, numbers, or underscores for your handle.");
      return;
    }
    setBusy(true);
    try {
      const result = register
        ? await authClient.signUp.email({ email, password, name: handle, username: handle })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Could not complete sign in.");
        return;
      }
      router.push(register ? "/onboarding" : "/play");
      router.refresh();
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <header className="auth-top"><Link href="/" className="wordmark" aria-label="SystemWars home"><Brand/></Link><Link href="/" className="auth-exit">BACK TO HOME <ArrowRight size={16}/></Link></header>
    <div className="auth-layout">
      <section className="auth-intro"><span className="page-kicker"><ShieldCheck size={16}/> SYSTEMWARS / PLAYER ACCESS</span><h1>{register ? <>Create<br/><span>account.</span></> : <>Sign<br/><span>in.</span></>}</h1><div className="auth-track"><span className={register ? "auth-track-active" : ""}>01 ACCOUNT</span><i/><span className={!register ? "auth-track-active" : ""}>02 PLAYER</span><i/><span>03 MATCH</span></div><p>{register ? "Choose your handle. Your rank starts when ranked matches go live." : "Pick up where you left off."}</p></section>
      <section className="auth-panel" aria-label={register ? "Create account" : "Sign in"}><div className="auth-panel-top"><span>{register ? "NEW PLAYER" : "PLAYER LOGIN"}</span><LockKeyhole size={18}/></div><form onSubmit={submit}>
        {register && <label className="auth-field">PLAYER HANDLE<input required minLength={3} maxLength={20} autoComplete="username" value={handle} onChange={event => setHandle(event.target.value)} placeholder="your_handle"/><small>3–20 letters, numbers, or underscores</small></label>}
        <label className="auth-field">EMAIL<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <label className="auth-field">PASSWORD<input required type="password" minLength={8} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters"/></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>{busy ? "PLEASE WAIT" : register ? "CREATE ACCOUNT" : "SIGN IN"}<ArrowRight size={19}/></button>
      </form><div className="auth-switch">{register ? "ALREADY HAVE AN ACCOUNT?" : "NEW TO SYSTEMWARS?"}<Link href={register ? "/login" : "/register"}>{register ? "SIGN IN" : "CREATE ACCOUNT"}</Link></div></section>
    </div>
  </main>;
}
