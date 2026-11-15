import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

type Friendship = { requested_by: string; status: "pending" | "accepted" };

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = db.prepare(`SELECT f.status, f.requested_by AS requestedBy,
    u.id, COALESCE(u."displayUsername", u.username, u.name) AS handle
    FROM friendship f JOIN user u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
    WHERE f.user_a = ? OR f.user_b = ? ORDER BY f.updated_at DESC`)
    .all(session.user.id, session.user.id, session.user.id) as { status: string; requestedBy: string; id: string; handle: string }[];
  return NextResponse.json({ friends: rows.filter(row => row.status === "accepted"), incoming: rows.filter(row => row.status === "pending" && row.requestedBy !== session.user.id), outgoing: rows.filter(row => row.status === "pending" && row.requestedBy === session.user.id) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { targetId, action } = body as { targetId?: unknown; action?: unknown };
  if (typeof targetId !== "string" || targetId.length > 128 || targetId === session.user.id || !["request", "accept", "decline", "remove"].includes(String(action))) {
    return NextResponse.json({ error: "Invalid friend action" }, { status: 400 });
  }
  const target = db.prepare("SELECT 1 FROM user u JOIN player_profile p ON p.user_id = u.id WHERE u.id = ?").get(targetId);
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const [userA, userB] = [session.user.id, targetId].sort();
  const outcome = db.transaction(() => {
    const row = db.prepare("SELECT requested_by, status FROM friendship WHERE user_a = ? AND user_b = ?").get(userA, userB) as Friendship | undefined;
    if (action === "request") {
      if (row) return row.status === "accepted" ? "Already friends" : "Friend request already pending";
      db.prepare("INSERT INTO friendship (user_a, user_b, requested_by, status, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?)")
        .run(userA, userB, session.user.id, Date.now(), Date.now());
      return null;
    }
    if (!row) return "No friend request found";
    if (action === "accept") {
      if (row.status !== "pending" || row.requested_by === session.user.id) return "No incoming request to accept";
      db.prepare("UPDATE friendship SET status = 'accepted', updated_at = ? WHERE user_a = ? AND user_b = ?").run(Date.now(), userA, userB);
      return null;
    }
    if (action === "decline" && (row.status !== "pending" || row.requested_by === session.user.id)) return "No incoming request to decline";
    db.prepare("DELETE FROM friendship WHERE user_a = ? AND user_b = ?").run(userA, userB);
    return null;
  })();
  if (outcome) return NextResponse.json({ error: outcome }, { status: 409 });
  return NextResponse.json({ ok: true });
}
