"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Radio, X } from "lucide-react";

type Peer = { id: string; handle: string };
type Signal = { id: number; fromUser: string; kind: "offer" | "answer" | "candidate"; payload: RTCSessionDescriptionInit | RTCIceCandidateInit };

export function MatchVoiceChat({ matchId, userId, mode }: { matchId: string; userId: string; mode: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(0);
  const [error, setError] = useState("");
  const media = useRef<MediaStream | null>(null);
  const calls = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const audioHost = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const cursor = useRef(0);
  const running = useRef(false);
  const polling = useRef(false);
  const iceServers = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);

  const endpoint = `/api/matches/${encodeURIComponent(matchId)}/voice`;
  const send = useCallback(async (body: object) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("Voice connection interrupted.");
  }, [endpoint]);

  const closePeer = useCallback((id: string) => {
    const call = calls.current.get(id);
    if (call) { call.close(); calls.current.delete(id); }
    pendingIce.current.delete(id);
    audioHost.current?.querySelector(`[data-voice-peer="${CSS.escape(id)}"]`)?.remove();
    setConnected([...calls.current.values()].filter(peer => peer.connectionState === "connected").length);
  }, []);

  const leave = useCallback((notify = true) => {
    if (!running.current && !media.current) return;
    running.current = false;
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    for (const id of [...calls.current.keys()]) closePeer(id);
    media.current?.getTracks().forEach(track => track.stop());
    media.current = null;
    cursor.current = 0;
    setActive(false);
    setMuted(false);
    setPeers([]);
    if (notify) void send({ action: "leave" }).catch(() => {});
  }, [closePeer, send]);

  useEffect(() => () => leave(false), [leave]);

  const createCall = useCallback((id: string) => {
    const existing = calls.current.get(id);
    if (existing) return existing;
    const call = new RTCPeerConnection({ iceServers: iceServers.current });
    media.current?.getTracks().forEach(track => call.addTrack(track, media.current!));
    call.onicecandidate = event => {
      if (event.candidate) void send({ action: "signal", to: id, kind: "candidate", payload: event.candidate.toJSON() }).catch(() => setError("Voice connection interrupted."));
    };
    call.ontrack = event => {
      const stream = event.streams[0];
      if (!stream || !audioHost.current) return;
      let audio = audioHost.current.querySelector<HTMLAudioElement>(`[data-voice-peer="${CSS.escape(id)}"]`);
      if (!audio) { audio = document.createElement("audio"); audio.autoplay = true; audio.dataset.voicePeer = id; audioHost.current.append(audio); }
      audio.srcObject = stream;
      void audio.play().catch(() => setError("Click VOICE again to allow audio playback."));
    };
    call.onconnectionstatechange = () => {
      setConnected([...calls.current.values()].filter(peer => peer.connectionState === "connected").length);
      if (call.connectionState === "failed" || call.connectionState === "closed") closePeer(id);
    };
    calls.current.set(id, call);
    return call;
  }, [closePeer, send]);

  const applySignal = useCallback(async (signal: Signal) => {
    const call = createCall(signal.fromUser);
    if (signal.kind === "offer") {
      await call.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
      for (const candidate of pendingIce.current.get(signal.fromUser) ?? []) await call.addIceCandidate(candidate);
      pendingIce.current.delete(signal.fromUser);
      const answer = await call.createAnswer();
      await call.setLocalDescription(answer);
      await send({ action: "signal", to: signal.fromUser, kind: "answer", payload: answer });
    } else if (signal.kind === "answer") {
      await call.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
      for (const candidate of pendingIce.current.get(signal.fromUser) ?? []) await call.addIceCandidate(candidate);
      pendingIce.current.delete(signal.fromUser);
    } else if (call.remoteDescription) await call.addIceCandidate(signal.payload as RTCIceCandidateInit);
    else pendingIce.current.set(signal.fromUser, [...pendingIce.current.get(signal.fromUser) ?? [], signal.payload as RTCIceCandidateInit]);
  }, [createCall, send]);

  const poll = useCallback(async () => {
    if (!running.current || polling.current) return;
    polling.current = true;
    try {
      const response = await fetch(`${endpoint}?after=${cursor.current}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Voice room disconnected.");
      const data = await response.json() as { peers: Peer[]; signals: Signal[]; iceServers?: RTCIceServer[] };
      if (!running.current) return;
      if (data.iceServers?.length) iceServers.current = data.iceServers;
      setPeers(data.peers);
      for (const signal of data.signals) {
        try { await applySignal(signal); } catch { setError("Could not connect to a player’s audio."); }
        cursor.current = Math.max(cursor.current, signal.id);
      }
      const present = new Set(data.peers.map(peer => peer.id));
      for (const id of [...calls.current.keys()]) if (!present.has(id)) closePeer(id);
      for (const peer of data.peers) {
        if (calls.current.has(peer.id)) continue;
        const call = createCall(peer.id);
        if (userId < peer.id) {
          try {
            const offer = await call.createOffer();
            await call.setLocalDescription(offer);
            await send({ action: "signal", to: peer.id, kind: "offer", payload: offer });
          } catch { closePeer(peer.id); setError("Could not start a voice connection."); }
        }
      }
    } catch { setError("Voice room disconnected. Reconnecting…"); }
    finally { polling.current = false; }
  }, [applySignal, closePeer, createCall, endpoint, send, userId]);

  async function join() {
    if (running.current) return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") { setError("Voice chat needs a browser with microphone access."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      media.current = stream;
      await send({ action: "join" });
      running.current = true;
      setActive(true);
      setOpen(true);
      await poll();
      timer.current = window.setInterval(() => void poll(), 1200);
    } catch {
      media.current?.getTracks().forEach(track => track.stop());
      media.current = null;
      setError("Microphone access was denied or unavailable.");
      setOpen(true);
    }
  }

  function toggleMute() {
    const next = !muted;
    media.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  }

  return <>
    <button type="button" className={`match-voice-toggle ${active ? "match-voice-active" : ""}`} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Voice chat"><Radio size={17}/> VOICE{active ? <i aria-hidden="true"/> : null}</button>
    <div ref={audioHost} hidden aria-hidden="true"/>
    {open && createPortal(<aside className="match-voice-panel" aria-label="Match voice chat">
      <header><span><Radio size={19}/> VOICE COMMS</span><button type="button" onClick={() => setOpen(false)} aria-label="Close voice panel"><X size={19}/></button></header>
      <p>{mode === "1v1" ? "Talk with your opponent" : "Team voice channel"}</p>
      <div className="match-voice-status"><span className={active ? "live" : ""}/>{active ? connected > 0 ? `${connected} PLAYER${connected > 1 ? "S" : ""} CONNECTED` : "WAITING FOR PLAYERS" : "VOICE IS OFF"}</div>
      {active && peers.length > 0 && <ul>{peers.map(peer => <li key={peer.id}>{peer.handle}<small>IN VOICE</small></li>)}</ul>}
      {error && <p className="match-voice-error" role="alert">{error}</p>}
      <div className="match-voice-actions">{active ? <><button type="button" onClick={toggleMute}>{muted ? <MicOff size={18}/> : <Mic size={18}/>} {muted ? "UNMUTE" : "MUTE"}</button><button type="button" onClick={() => leave()}>LEAVE VOICE</button></> : <button type="button" onClick={join}><Mic size={18}/> JOIN VOICE</button>}</div>
    </aside>, document.body)}
  </>;
}
