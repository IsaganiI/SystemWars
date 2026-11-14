import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") ?? "1v1";
  if (mode !== "1v1" && mode !== "2v2" && mode !== "3v3") return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  const players = db.prepare('SELECT u.name AS handle, r.rating, r.wins, r.losses FROM player_rating r JOIN "user" u ON u.id = r.user_id WHERE r.mode = ? AND (r.wins + r.losses) > 0 ORDER BY r.rating DESC, r.wins DESC LIMIT 100').all(mode);
  return NextResponse.json({ mode, players });
}
