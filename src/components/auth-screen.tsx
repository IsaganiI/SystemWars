"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand } from "@/components/brand";

export function AuthScreen({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedHandle = handle.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (register && !/^[A-Za-z0-9_]{3,20}$/.test(normalizedHandle)) {
      setError("Use 3–20 letters, numbers, or underscores for your handle.");
      return;
    }
    if (register && password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (register && password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const result = register
        ? await authClient.signUp.email({ email: normalizedEmail, password, name: normalizedHandle, username: normalizedHandle })
        : await authClient.signIn.email({ email: normalizedEmail, password });
      if (result.error) {
        const code = result.error.code ?? "";
        const message = (result.error.message ?? "").toLowerCase();
        if (code.includes("USERNAME") || message.includes("username")) setError("That handle is taken. Try another.");
        else if (code.includes("USER_ALREADY_EXISTS") || message.includes("already exists")) setError("An account with that email already exists. Sign in instead.");
        else if (!register && (code.includes("INVALID") || message.includes("invalid"))) setError("Email or password is incorrect.");
        else setError(result.error.message ?? "Could not complete this request.");
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
    <header className="auth-top"><Link href="/" className="wordmark" aria-label="SystemWars home"><Brand/></Link><Link href="/" className="auth-exit"><ArrowLeft size={16}/> BACK</Link></header>
    <div className={`auth-layout auth-layout-${mode}`}>
      <div className="auth-intro" aria-hidden="true">
        <div className="auth-impact"><span>{register ? "NEW CHALLENGER" : "PLAYER ONE"}</span><strong>READY?</strong><b>FIGHT!</b></div>
      </div>
      <section className="auth-panel" aria-label={register ? "Create account" : "Sign in"}><div className="auth-form-head"><h1>{register ? "JOIN THE ARENA" : "SIGN IN"}</h1></div><form onSubmit={submit}>
        {register && <label className="auth-field">PLAYER HANDLE<input required minLength={3} maxLength={20} autoComplete="username" value={handle} onChange={event => setHandle(event.target.value)} placeholder="your_handle"/></label>}
        <label className="auth-field">EMAIL<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <label className="auth-field">PASSWORD<input required type="password" minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={register ? "At least 8 characters" : "Password"}/></label>
        {register && <label className="auth-field">CONFIRM PASSWORD<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat password"/></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>{busy ? "PLEASE WAIT" : register ? "CREATE ACCOUNT" : "SIGN IN"}<ArrowRight size={19}/></button>
      </form><div className="auth-switch"><Link href={register ? "/login" : "/register"}>{register ? "ALREADY A PLAYER? SIGN IN" : "NEW CHALLENGER? CREATE ACCOUNT"}<ArrowRight size={19}/></Link></div></section>
    </div>
  </main>;
}
