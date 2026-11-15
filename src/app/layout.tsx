import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import localFont from "next/font/local";
import { SiteAudioProvider, type AudioSection, type AudioTrack } from "@/components/site-music";
import "./globals.css";

const roboto = localFont({ src: "../assets/fonts/roboto-latin.woff2", weight: "400 800", display: "swap", variable: "--font-game" });
const barlowCondensed = localFont({ src: [
  { path: "../assets/fonts/barlow-condensed-800-latin.woff2", weight: "800" },
  { path: "../assets/fonts/barlow-condensed-900-latin.woff2", weight: "900" },
], display: "swap", variable: "--font-combat" });

export const metadata: Metadata = {
  title: "SystemWars — Competitive system design",
  description: "A competitive system design game. One brief, two builders, one winner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requested: { section: AudioSection; title: string; name: string; volume: number }[] = [
    { section: "menu", title: "PLANET WISP · ACT 1", name: "planet-wisp-act-1", volume: 0.32 },
    { section: "game", title: "BRAWL · MAIN THEME", name: "brawl-main-theme", volume: 0.32 },
    { section: "veto", title: "STAGE VETO", name: "veto-tension", volume: 0.45 },
    { section: "brief", title: "MATCH BRIEF", name: "brief-tv-static", volume: 0.12 },
  ];
  const tracks: AudioTrack[] = requested.flatMap(({ section, title, name, volume }) => {
    const file = ["mp3", "m4a", "ogg", "wav"].map((extension) => `${name}.${extension}`)
      .find((candidate) => existsSync(join(process.cwd(), "public/audio", candidate)));
    return file ? [{ section, title, src: `/audio/${file}`, volume }] : [];
  });
  // Browser extensions (Grammarly, dark mode, translators) add attributes to <html> and <body> before React
  // loads. suppressHydrationWarning ignores attribute differences on these two elements only; mismatches
  // anywhere inside the page are still reported.
  return <html lang="en" className={`${roboto.variable} ${barlowCondensed.variable}`} suppressHydrationWarning><body suppressHydrationWarning><SiteAudioProvider tracks={tracks}>{children}</SiteAudioProvider></body></html>;
}
