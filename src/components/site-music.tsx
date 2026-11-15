"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Music2, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
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
  const [musicVolume, setMusicVolume] = useState(1);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const routeSection = sectionForPath(pathname, matchScene);
  const section = pathname === "/account" ? lastSectionRef.current : routeSection;
  const isBuildingMatch = pathname === "/match" && matchScene === "game";
  // Wait for the match screen to report its scene before selecting audio. This
  // avoids a briefing-track flash when a player reloads directly into a build.
  const matchSceneUnknown = pathname === "/match" && matchScene === null;
  const track = isBuildingMatch || matchSceneUnknown ? undefined : tracks.find((item) => item.section === section);
  const trackSrc = track?.src ?? null;
  const trackVolume = track?.volume ?? 0;
  const showControl = pathname === "/" || pathname === "/play";

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("systemwars-music-volume"));
      if (Number.isFinite(saved) && window.localStorage.getItem("systemwars-music-volume") !== null) {
        setMusicVolume(Math.min(1, Math.max(0, saved)));
      }
    } catch { /* Keep the default volume if browser storage is unavailable. */ }
  }, []);

  useEffect(() => {
    if (pathname !== "/account") lastSectionRef.current = routeSection;
  }, [pathname, routeSection]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = trackVolume * musicVolume;
    // Keep the same media element and playhead when moving between menu routes.
    // The source is rendered on the element so playback can begin before hydration.
    audio.muted = false;
    if (!trackSrc || !enabled) { audio.pause(); return; }
    if (audio.paused) void audio.play().then(() => setNeedsGesture(false)).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "NotAllowedError") setNeedsGesture(true);
      else setError(true);
    });
  }, [enabled, trackSrc, trackVolume, musicVolume]);

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
    if (playing) { setEnabled(false); setVolumeOpen(false); return; }
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
      <div className="site-music-controls">
      <button className="site-music-toggle" type="button" aria-label={playing ? "Pause site music" : "Play site music"} aria-pressed={playing} onClick={toggle}>
        <Music2 size={17} aria-hidden="true"/>
        <span><small>{track.title}</small><strong>{error ? "AUDIO ERROR" : musicVolume === 0 ? "MUSIC MUTED" : playing ? "MUSIC ON" : needsGesture ? "TAP TO PLAY" : "PLAY MUSIC"}</strong></span>
        {playing && musicVolume > 0 ? <Volume2 size={18} aria-hidden="true"/> : <VolumeX size={18} aria-hidden="true"/>}
      </button>
      <button className="site-music-volume-toggle" type="button" aria-label={volumeOpen ? "Hide music volume" : "Show music volume"} aria-expanded={volumeOpen && enabled} aria-controls="site-music-volume" disabled={!enabled} onClick={() => setVolumeOpen(open => !open)}>
        <SlidersHorizontal size={17} aria-hidden="true"/>
      </button>
      </div>
      {volumeOpen && enabled && <label className="site-music-volume" id="site-music-volume">
        <Volume2 size={15} aria-hidden="true"/>
        <span className="sr-only">Music volume</span>
        <input type="range" min="0" max="100" step="1" value={Math.round(musicVolume * 100)} aria-label="Music volume" aria-valuetext={`${Math.round(musicVolume * 100)} percent`} onChange={event => {
          const next = Number(event.currentTarget.value) / 100;
          setMusicVolume(next);
          try { window.localStorage.setItem("systemwars-music-volume", String(next)); } catch { /* Volume still changes for this visit. */ }
        }}/>
        <output>{Math.round(musicVolume * 100)}%</output>
      </label>}
    </div>}
  </>;
}
