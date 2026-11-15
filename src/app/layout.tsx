import type { Metadata } from "next";
import localFont from "next/font/local";
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
  return <html lang="en" className={`${roboto.variable} ${barlowCondensed.variable}`}><body>{children}</body></html>;
}
