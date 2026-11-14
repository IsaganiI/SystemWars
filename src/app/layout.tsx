import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-game" });

export const metadata: Metadata = {
  title: "SystemWars — Competitive system design",
  description: "A competitive system design game. One brief, two builders, one winner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={outfit.variable}><body>{children}</body></html>;
}
