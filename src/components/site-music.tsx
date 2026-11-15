"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";

export type AudioSection = "menu" | "game" | "veto" | "brief";
export type AudioTrack = { section: AudioSection; title: string; src: string; volume: number };
type MatchScene = "brief" | "game";

const MatchSceneContext = createContext<((scene: MatchScene | null) => void) | null>(null);

export function useMatchAudioScene(scene: MatchScene) {
  const setScene = useContext(MatchSceneContext);
  useEffect(() => {
    setScene?.(scene);
    return () => setScene?.(null);
  }, [scene, setScene]);
}

export function SiteAudioProvider({ children, tracks }: { children: ReactNode; tracks: AudioTrack[] }) {
  const [matchScene, setMatchScene] = useState<MatchScene | null>(null);
  return <MatchSceneContext.Provider value={setMatchScene}>
    {children}
    <SiteMusic tracks={tracks} matchScene={matchScene}/>
  </MatchSceneContext.Provider>;
}

function sectionForPath(pathname: string, matchScene: MatchScene | null): AudioSection {
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return "menu";
  if (pathname === "/veto") return "veto";
  if (pathname === "/match") return matchScene ?? "brief";
  return "game";
}

function SiteMusic({ tracks, matchScene }: { tracks: AudioTrack[]; matchScene: MatchScene | null }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  // Account settings are an overlay destination in the same session, not a new
  // music area. Keep whichever soundtrack was active before opening the page.
  const lastSectionRef = useRef<AudioSection>("game");
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [error, setError] = useState(false);
  const routeSection = sectionForPath(pathname, matchScene);
  const section = pathname === "/account" ? lastSectionRef.current : routeSection;
  const track = tracks.find((item) => item.section === section);
  const trackSrc = track?.src ?? null;
  const trackVolume = track?.volume ?? 0;
  const showControl = pathname === "/" || pathname === "/play";

  useEffect(() => {
    if (pathname !== "/account") lastSectionRef.current = routeSection;
  }, [pathname, routeSection]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = trackVolume;
    // Keep the same media element and playhead when moving between menu routes.
    // The source is rendered on the element so playback can begin before hydration.
    audio.muted = false;
    if (!trackSrc || !enabled) { audio.pause(); return; }
    if (audio.paused) void audio.play().then(() => setNeedsGesture(false)).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "NotAllowedError") setNeedsGesture(true);
      else setError(true);
    });
  }, [enabled, trackSrc, trackVolume]);

  useEffect(() => {
    if (!enabled || !trackSrc) return;
    // Browser autoplay requires a gesture. Route changes keep this element alive.
    const resume = () => {
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.muted = false;
      void audio.play().then(() => setNeedsGesture(false)).catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "NotAllowedError") setNeedsGesture(true);
        else setError(true);
      });
    };
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
    return () => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
    };
  }, [enabled, trackSrc]);

  function toggle() {
    if (playing) { setEnabled(false); return; }
    setEnabled(true);
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      void audio.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true));
    }
  }

  return <>
    <audio ref={audioRef} src={trackSrc ?? undefined} autoPlay={enabled && Boolean(trackSrc)} muted={false} loop preload="auto" onPlay={() => { setPlaying(true); setNeedsGesture(false); setError(false); }} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setError(true); }}/>
    {track && showControl && <div className="site-music">
      <button type="button" aria-label={playing ? "Mute site music" : "Play site music"} aria-pressed={playing} onClick={toggle}>
        <Music2 size={17} aria-hidden="true"/>
        <span><small>{track.title}</small><strong>{error ? "AUDIO ERROR" : playing ? "MUSIC ON" : needsGesture ? "TAP TO PLAY" : "PLAY MUSIC"}</strong></span>
        {playing ? <Volume2 size={18} aria-hidden="true"/> : <VolumeX size={18} aria-hidden="true"/>}
      </button>
    </div>}
  </>;
}
