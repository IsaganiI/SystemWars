import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystemWars — Competitive system design",
  description: "A competitive system design game. One brief, two builders, one winner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
