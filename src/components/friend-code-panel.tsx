"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Link2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

type CodeState = { code: string; requests: "code" | "anyone"; resetsLeft: number };

/**
 * Your private friend code, like Game Center's: share it with people you want to play with. Adding a code only
 * sends a request; the other player still has to accept. Codes can be reset at any time.
 */
/** `sharedCode` comes from an invite link (/players?add=CODE) so the code is ready to send. */
export function FriendCodePanel({ onChange, sharedCode = "" }: { onChange?: () => void; sharedCode?: string }) {
  const [state, setState] = useState<CodeState | null>(null);
  const [input, setInput] = useState(sharedCode.slice(0, 40));
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const apply = useCallback(async (response: Response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
    setState(body as CodeState);
  }, []);

  useEffect(() => {
    void fetch("/api/friends/code", { cache: "no-store" }).then(apply).catch(() => setMessage({ kind: "error", text: "Could not load your friend code." }));
  }, [apply]);

  async function copy(kind: "code" | "link") {
    if (!state) return;
    const text = kind === "code" ? state.code : `${window.location.origin}/players?add=${encodeURIComponent(state.code)}`;
    try { await navigator.clipboard.writeText(text); setCopied(kind); window.setTimeout(() => setCopied(null), 2000); }
    catch { setMessage({ kind: "error", text: "Could not copy. Select the code and copy it by hand." }); }
  }

  async function post(body: object) {
    setBusy(true);
    setMessage(null);
    try { await apply(await fetch("/api/friends/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); return true; }
    catch (cause) { setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "Something went wrong." }); return false; }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    if (await post({ action: "reset" })) setMessage({ kind: "ok", text: "New code ready. Your old code no longer works." });
  }

  async function addFriend(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", code: input }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not send the request.");
      setMessage({ kind: "ok", text: `Friend request sent to ${body.handle}. They need to accept it.` });
      setInput("");
      if (window.location.search.includes("add=")) window.history.replaceState(null, "", window.location.pathname);
      onChange?.();
    } catch (cause) { setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "Could not send the request." }); }
    finally { setBusy(false); }
  }

  return <section className="roster-section friend-code-panel" aria-label="Friend code">
    <header><KeyRound size={21}/><h2>FRIEND CODE</h2><span><ShieldCheck size={15}/> PRIVATE</span></header>
    <div className="friend-code-body">
      <div className="friend-code-mine">
        <small>YOUR CODE · SHARE IT ONLY WITH PEOPLE YOU WANT TO PLAY WITH</small>
        <strong className="friend-code-value" aria-live="polite">{state?.code ?? "SW-····-····-····"}</strong>
        <div className="friend-code-actions">
          <button type="button" onClick={() => copy("code")} disabled={!state}>{copied === "code" ? <Check size={17}/> : <Copy size={17}/>}{copied === "code" ? "COPIED" : "COPY CODE"}</button>
          <button type="button" onClick={() => copy("link")} disabled={!state}>{copied === "link" ? <Check size={17}/> : <Link2 size={17}/>}{copied === "link" ? "LINK COPIED" : "COPY INVITE LINK"}</button>
          <button type="button" onClick={reset} disabled={!state || busy || state.resetsLeft === 0} className={confirmReset ? "friend-code-confirm" : ""} onBlur={() => setConfirmReset(false)}><RefreshCw size={17}/>{confirmReset ? "OLD CODE STOPS WORKING · CONFIRM" : "NEW CODE"}</button>
        </div>
        <div className="friend-code-policy" role="group" aria-label="Who can send you friend requests">
          <span>FRIEND REQUESTS FROM</span>
          <button type="button" aria-pressed={state?.requests === "code"} disabled={!state || busy} onClick={() => post({ action: "policy", requests: "code" })}>PEOPLE WITH MY CODE</button>
          <button type="button" aria-pressed={state?.requests === "anyone"} disabled={!state || busy} onClick={() => post({ action: "policy", requests: "anyone" })}>ANYONE</button>
        </div>
      </div>
      <form className="friend-code-add" onSubmit={addFriend}>
        <label htmlFor="friend-code-input">ADD A FRIEND BY CODE</label>
        <div><input id="friend-code-input" value={input} onChange={event => setInput(event.target.value)} maxLength={40} placeholder="SW-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} autoCapitalize="characters"/><button type="submit" disabled={busy || !input.trim()}><UserPlus size={17}/> SEND REQUEST</button></div>
        <p>They get a request and choose whether to accept. Codes are not case-sensitive.</p>
      </form>
    </div>
    {message && <p className={`friend-code-message friend-code-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
  </section>;
}
