import type { Metadata } from "next";
import { Barlow_Condensed, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-game" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["800", "900"], display: "swap", variable: "--font-combat" });

export const metadata: Metadata = {
  title: "SystemWars — Competitive system design",
  description: "A competitive system design game. One brief, two builders, one winner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${roboto.variable} ${barlowCondensed.variable}`}><body>{children}</body></html>;
}
