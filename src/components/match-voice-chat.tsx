"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Radio, Volume2, VolumeX, X } from "lucide-react";

type Peer = { id: string; handle: string };
type MicMode = "push" | "open";
const SPEAKING_LEVEL = 0.02;

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function level(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (const sample of buffer) sum += sample * sample;
  return Math.sqrt(sum / buffer.length);
}

type Signal = { id: number; fromUser: string; kind: "offer" | "answer" | "candidate"; payload: RTCSessionDescriptionInit | RTCIceCandidateInit };

export function MatchVoiceChat({ matchId, userId, mode }: { matchId: string; userId: string; mode: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(0);
  const [error, setError] = useState("");
  // Push to talk by default: the mic only sends while V (or the talk button) is held.
  const [micMode, setMicMode] = useState<MicMode>("push");
  const [talking, setTalking] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [silenced, setSilenced] = useState<Record<string, boolean>>({});
  const silencedRef = useRef(silenced);
  useEffect(() => { silencedRef.current = silenced; }, [silenced]);
  const audioContext = useRef<AudioContext | null>(null);
  const analysers = useRef(new Map<string, AnalyserNode>());
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
    analysers.current.delete(id);
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
    analysers.current.clear();
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    cursor.current = 0;
    setActive(false);
    setMuted(false);
    setTalking(false);
    setSpeaking({});
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
      audio.muted = silencedRef.current[id] ?? false;
      if (audioContext.current) {
        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 512;
        audioContext.current.createMediaStreamSource(stream).connect(analyser);
        analysers.current.set(id, analyser);
      }
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
      // Start silent: push to talk only sends while held.
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      media.current = stream;
      const context = new AudioContext();
      const own = context.createAnalyser();
      own.fftSize = 512;
      context.createMediaStreamSource(stream).connect(own);
      audioContext.current = context;
      analysers.current.set(userId, own);
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

  // The mic sends audio only while talking (push to talk) or when not muted (open mic).
  const transmitting = active && (micMode === "push" ? talking : !muted);
  useEffect(() => {
    media.current?.getAudioTracks().forEach(track => { track.enabled = transmitting; });
  }, [transmitting]);

  // Hold V to talk, unless typing in a field (the builder has text inputs).
  useEffect(() => {
    if (!active || micMode !== "push") return;
    const down = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "v" && !event.repeat && !isTyping(event.target)) setTalking(true); };
    const up = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "v") setTalking(false); };
    const blur = () => setTalking(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [active, micMode]);

  // Speaking indicators from audio levels (yours and each teammate's).
  useEffect(() => {
    if (!active) return;
    const buffer = new Float32Array(512);
    const timer = window.setInterval(() => {
      const next: Record<string, boolean> = {};
      for (const [id, analyser] of analysers.current) next[id] = level(analyser, buffer) > SPEAKING_LEVEL;
      setSpeaking(next);
    }, 150);
    return () => window.clearInterval(timer);
  }, [active]);

  function toggleMute() {
    setMuted(value => !value);
  }

  /** Mutes one teammate for you only; they are not told. */
  function toggleSilenced(id: string) {
    const next = !silenced[id];
    setSilenced(current => ({ ...current, [id]: next }));
    const audio = audioHost.current?.querySelector<HTMLAudioElement>(`[data-voice-peer="${CSS.escape(id)}"]`);
    if (audio) audio.muted = next;
  }

  if (mode === "1v1") return null;

  return <>
    <button type="button" className={`match-voice-toggle ${active ? "match-voice-active" : ""}`} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Voice chat"><Radio size={17}/> VOICE{active ? <i aria-hidden="true"/> : null}</button>
    <div ref={audioHost} hidden aria-hidden="true"/>
    {open && createPortal(<aside className="match-voice-panel" aria-label="Match voice chat">
      <header><span><Radio size={19}/> VOICE COMMS</span><button type="button" onClick={() => setOpen(false)} aria-label="Close voice panel"><X size={19}/></button></header>
      <p>Team voice channel. Your opponents can’t hear you.</p>
      <div className="match-voice-status"><span className={active ? "live" : ""}/>{active ? connected > 0 ? `${connected} PLAYER${connected > 1 ? "S" : ""} CONNECTED` : "WAITING FOR PLAYERS" : "VOICE IS OFF"}</div>
      {active && <ul className="match-voice-roster">
        <li className={speaking[userId] && transmitting ? "match-voice-speaking" : ""}><span>You<small>{transmitting ? "TALKING" : micMode === "push" ? "HOLD V TO TALK" : "MUTED"}</small></span><i className="match-voice-level" aria-hidden="true"><b/><b/><b/></i></li>
        {peers.map(peer => <li key={peer.id} className={speaking[peer.id] && !silenced[peer.id] ? "match-voice-speaking" : ""}><span>{peer.handle}<small>{silenced[peer.id] ? "MUTED FOR YOU" : "IN VOICE"}</small></span><button type="button" className="match-voice-silence" onClick={() => toggleSilenced(peer.id)} aria-pressed={Boolean(silenced[peer.id])} aria-label={`${silenced[peer.id] ? "Unmute" : "Mute"} ${peer.handle} for you`}>{silenced[peer.id] ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button></li>)}
      </ul>}
      {active && <div className="match-voice-mode" role="group" aria-label="Microphone mode"><button type="button" aria-pressed={micMode === "push"} onClick={() => { setMicMode("push"); setTalking(false); }}>PUSH TO TALK</button><button type="button" aria-pressed={micMode === "open"} onClick={() => { setMicMode("open"); setMuted(false); }}>OPEN MIC</button></div>}
      {error && <p className="match-voice-error" role="alert">{error}</p>}
      <div className="match-voice-actions">{active ? <>{micMode === "push" ? <button type="button" className={`match-voice-talk ${talking ? "match-voice-talk-on" : ""}`} onPointerDown={() => setTalking(true)} onPointerUp={() => setTalking(false)} onPointerLeave={() => setTalking(false)} aria-pressed={talking}><Radio size={18}/> HOLD TO TALK <kbd>V</kbd></button> : <button type="button" onClick={toggleMute}>{muted ? <MicOff size={18}/> : <Mic size={18}/>} {muted ? "UNMUTE" : "MUTE"}</button>}<button type="button" onClick={() => leave()}>LEAVE VOICE</button></> : <button type="button" onClick={join}><Mic size={18}/> JOIN VOICE</button>}</div>
    </aside>, document.body)}
  </>;
}
