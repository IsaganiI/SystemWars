import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { normalizeFriendCode } from "@/lib/friend-code";
import { FRIEND_LIMITS, lookupFriendCode, lookupWaitSeconds, pendingIncomingCount, requestPolicy } from "@/lib/friends";

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
  const { action, code } = body as { targetId?: unknown; action?: unknown; code?: unknown };
  let { targetId } = body as { targetId?: unknown };
  const noMatch = "That code didn't match a player. Check it and try again.";
  // Adding by friend code: rate-limited, and errors never reveal more than "no match".
  const viaCode = code !== undefined;
  if (viaCode) {
    if (action !== "request" || typeof code !== "string") return NextResponse.json({ error: "Invalid friend action" }, { status: 400 });
    const wait = lookupWaitSeconds(session.user.id);
    if (wait > 0) return NextResponse.json({ error: `Too many tries. Wait ${Math.ceil(wait / 60)} min before trying another code.`, retryAfter: wait }, { status: 429, headers: { "Retry-After": String(wait) } });
    const normalized = normalizeFriendCode(code);
    if (!normalized) return NextResponse.json({ error: "Friend codes look like SW-XXXX-XXXX-XXXX." }, { status: 400 });
    const owner = lookupFriendCode(session.user.id, normalized);
    if (!owner) return NextResponse.json({ error: noMatch }, { status: 404 });
    if (owner === session.user.id) return NextResponse.json({ error: "That's your own friend code. Share it with people you want to play with." }, { status: 400 });
    targetId = owner;
  }
  if (typeof targetId !== "string" || targetId.length > 128 || targetId === session.user.id || !["request", "accept", "decline", "remove"].includes(String(action))) {
    return NextResponse.json({ error: "Invalid friend action" }, { status: 400 });
  }
  const target = db.prepare(`SELECT COALESCE(u."displayUsername", u.username, u.name) AS handle FROM user u JOIN player_profile p ON p.user_id = u.id WHERE u.id = ?`).get(targetId) as { handle: string } | undefined;
  if (!target) return NextResponse.json({ error: viaCode ? noMatch : "Player not found" }, { status: 404 });
  const targetUser: string = targetId;
  const [userA, userB] = [session.user.id, targetUser].sort();
  const outcome = db.transaction(() => {
    const row = db.prepare("SELECT requested_by, status FROM friendship WHERE user_a = ? AND user_b = ?").get(userA, userB) as Friendship | undefined;
    if (action === "request") {
      // They already asked you: using their code (or the button) accepts, like Game Center.
      if (row?.status === "pending" && row.requested_by === targetUser) {
        db.prepare("UPDATE friendship SET status = 'accepted', updated_at = ? WHERE user_a = ? AND user_b = ?").run(Date.now(), userA, userB);
        return null;
      }
      if (row) return row.status === "accepted" ? "Already friends" : "Friend request already pending";
      // Players choose who can reach them. By default only people with their friend code can.
      if (!viaCode && requestPolicy(targetUser) === "code") return "This player only accepts friend requests by friend code";
      if (pendingIncomingCount(targetUser) >= FRIEND_LIMITS.pendingIncoming) return "This player has too many pending requests. Try again later";
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
  return NextResponse.json({ ok: true, handle: target.handle });
}
