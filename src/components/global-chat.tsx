"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send, UsersRound } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";

type Message = { id: number; userId: string; handle: string; body: string; createdAt: number; own: boolean };
type ChatResponse = { messages: Message[]; online: number; error?: string };

function timestamp(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value);
}

export function GlobalChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const sendingRef = useRef(false);
  const cursor = useRef(0);
  const polling = useRef(false);
  const feed = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const poll = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const response = await fetch(`/api/global-chat?after=${cursor.current}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Chat disconnected");
      const data = await response.json() as ChatResponse;
      setConnected(true);
      setOnline(data.online ?? 0);
      const previousCursor = cursor.current;
      if (data.messages.length) cursor.current = Math.max(cursor.current, ...data.messages.map(item => item.id));
      setMessages(current => {
        if (previousCursor === 0) return data.messages;
        const known = new Set(current.map(item => item.id));
        return [...current, ...data.messages.filter(item => item.id > previousCursor && !known.has(item.id))].sort((a, b) => a.id - b.id).slice(-75);
      });
    } catch {
      setConnected(false);
    } finally {
      polling.current = false;
    }
  }, []);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void poll(); }, 2500);
    return () => window.clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    if (!pinnedToBottom.current || !feed.current) return;
    feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = message.trim();
    if (!body || sending || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const data = await response.json() as { message?: Message; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Message could not be sent.");
      pinnedToBottom.current = true;
      setMessages(current => [...current.filter(item => item.id !== data.message!.id), data.message!].sort((a, b) => a.id - b.id).slice(-75));
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return <aside className="global-chat" aria-label="Global lobby chat">
    <header className="global-chat-head">
      <div><MessageCircle size={21} strokeWidth={2.2}/><strong>WORLD CHAT</strong></div>
      <span className={connected ? "global-chat-live" : "global-chat-offline"}><i aria-hidden="true"/>{connected ? "LIVE" : "RECONNECTING"}</span>
    </header>
    <div className="global-chat-subhead"><span>THE ARENA</span><span><UsersRound size={14}/>{online} ONLINE</span></div>
    <div className="global-chat-feed" ref={feed} onScroll={event => {
      const element = event.currentTarget;
      pinnedToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    }} role="log" aria-label="Lobby messages" aria-live="polite" aria-relevant="additions text">
      {messages.length ? messages.map(item => <article className={`global-chat-message ${item.own || item.userId === userId ? "global-chat-message-own" : ""}`} key={item.id}>
        <span className="global-chat-avatar" aria-hidden="true"><PlayerAvatar userId={item.userId} alt=""/></span>
        <div className="global-chat-copy"><div><strong>{item.handle}{item.own || item.userId === userId ? <em>YOU</em> : null}</strong><time dateTime={new Date(item.createdAt).toISOString()}>{timestamp(item.createdAt)}</time></div><p>{item.body}</p></div>
      </article>) : <div className="global-chat-empty"><span className="global-chat-empty-mark"><MessageCircle size={25}/></span><strong>THE CHANNEL IS QUIET</strong><p>Be the first fighter to call out.</p></div>}
    </div>
    <form className="global-chat-form" onSubmit={submit}>
      <span className="global-chat-compose-avatar" aria-hidden="true"><PlayerAvatar userId={userId} alt=""/></span>
      <label className="global-chat-input-wrap"><span className="sr-only">Message the lobby</span><input value={message} onChange={event => setMessage(event.target.value)} maxLength={280} placeholder="Message the lobby…" autoComplete="off"/></label>
      <button type="submit" aria-label="Send message" disabled={!message.trim() || sending}><Send size={18}/></button>
    </form>
    <div className="global-chat-foot"><span>ENTER TO SEND</span><span>KEEP IT RESPECTFUL</span></div>
    {error && <p className="global-chat-error" role="alert">{error}</p>}
  </aside>;
}
