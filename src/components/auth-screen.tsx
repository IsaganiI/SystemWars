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
    <div className="auth-layout">
      <div className="auth-intro" aria-hidden="true">
        <svg className="auth-diagram" viewBox="0 0 520 600" fill="none" focusable="false">
          <path className="auth-diagram-route" d="M160 186H172M328 186H410V300M250 222V330M326 352H342M260 402V460H342"/>
          <circle className="auth-diagram-joint" cx="410" cy="242" r="3"/><circle className="auth-diagram-joint" cx="260" cy="460" r="3"/>
          <g className="auth-diagram-node"><rect x="42" y="150" width="118" height="72" rx="5"/><path d="M85 173h31v20H85zM100 193v7M91 200h18"/><text x="101" y="213" textAnchor="middle">CLIENT</text></g>
          <g className="auth-diagram-node"><rect x="172" y="150" width="156" height="72" rx="5"/><path d="M249 171v13m-13 0h26m-26 0v11m26-11v11m-29 0h6m20 0h6"/><text x="250" y="213" textAnchor="middle">LOAD BALANCER</text></g>
          <g className="auth-diagram-node"><rect x="194" y="330" width="132" height="72" rx="5"/><path d="M245 349h30v9h-30zM245 363h30v9h-30zM251 354h2m-2 14h2"/><text x="260" y="393" textAnchor="middle">APP SERVER</text></g>
          <g className="auth-diagram-node"><rect x="342" y="300" width="136" height="72" rx="5"/><path d="M394 318c0-4 22-4 22 0v19c0 4-22 4-22 0zm0 0c0 4 22 4 22 0m-22 10c0 4 22 4 22 0"/><text x="410" y="363" textAnchor="middle">DATABASE</text></g>
          <g className="auth-diagram-node"><rect x="342" y="424" width="136" height="72" rx="5"/><path d="M393 444h32v6h-32zm0 10h32v6h-32zm0 10h32v6h-32z"/><text x="410" y="487" textAnchor="middle">QUEUE</text></g>
        </svg>
      </div>
      <section className="auth-panel" aria-label={register ? "Create account" : "Sign in"}><div className="auth-panel-top"><span>{register ? "REGISTER" : "SIGN IN"}</span></div><div className="auth-form-head"><span>{register ? "NEW PLAYER" : "PLAYER LOGIN"}</span><h1>{register ? "Create account" : "Sign in"}</h1></div><form onSubmit={submit}>
        {register && <label className="auth-field">PLAYER HANDLE<input required minLength={3} maxLength={20} autoComplete="username" value={handle} onChange={event => setHandle(event.target.value)} placeholder="your_handle"/><small>3–20 letters, numbers, or underscores</small></label>}
        <label className="auth-field">EMAIL<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <label className="auth-field">PASSWORD<input required type="password" minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={register ? "At least 8 characters" : "Password"}/></label>
        {register && <label className="auth-field">CONFIRM PASSWORD<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat password"/></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>{busy ? "PLEASE WAIT" : register ? "CREATE ACCOUNT" : "SIGN IN"}<ArrowRight size={19}/></button>
      </form><div className="auth-switch">{register ? "Already have an account?" : "New here?"}<Link href={register ? "/login" : "/register"}>{register ? "SIGN IN" : "CREATE ACCOUNT"}</Link></div></section>
    </div>
  </main>;
}
