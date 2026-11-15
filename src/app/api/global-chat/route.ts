import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const MESSAGE_LIMIT = 280;
const POLL_WINDOW_MS = 10_000;
const MIN_POST_INTERVAL_MS = 1_500;
const MAX_POSTS_PER_WINDOW = 5;
const PRESENCE_WINDOW_MS = 90_000;

type ChatMessage = { id: number; userId: string; handle: string; body: string; createdAt: number };

async function signedInUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user;
}

function messageRows(after: number, userId: string) {
  const rows = after > 0
    ? db.prepare(`SELECT m.id, m.user_id AS userId, COALESCE(u."displayUsername", u.username, u.name) AS handle,
        m.body, m.created_at AS createdAt FROM global_chat_message m JOIN "user" u ON u.id = m.user_id
        WHERE m.id > ? ORDER BY m.id ASC LIMIT 100`).all(after)
    : db.prepare(`SELECT m.id, m.user_id AS userId, COALESCE(u."displayUsername", u.username, u.name) AS handle,
        m.body, m.created_at AS createdAt FROM global_chat_message m JOIN "user" u ON u.id = m.user_id
        WHERE m.id > (SELECT COALESCE(MAX(id) - 75, 0) FROM global_chat_message) ORDER BY m.id ASC LIMIT 75`).all();
  return (rows as ChatMessage[]).map(message => ({ ...message, own: message.userId === userId }));
}

export async function GET(request: Request) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const afterText = new URL(request.url).searchParams.get("after") ?? "0";
  const after = Number(afterText);
  if (!/^\d+$/.test(afterText) || !Number.isSafeInteger(after) || after < 0) {
    return NextResponse.json({ error: "Invalid chat cursor" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const now = Date.now();
  db.prepare("INSERT INTO global_chat_presence (user_id, seen_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET seen_at = excluded.seen_at")
    .run(user.id, now);
  db.prepare("DELETE FROM global_chat_presence WHERE seen_at < ?").run(now - PRESENCE_WINDOW_MS);
  const online = (db.prepare("SELECT COUNT(*) AS count FROM global_chat_presence WHERE seen_at >= ?").get(now - PRESENCE_WINDOW_MS) as { count: number }).count;
  return NextResponse.json({ messages: messageRows(after, user.id), online }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > 4_000) return NextResponse.json({ error: "Message is too long" }, { status: 413 });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid chat message" }, { status: 400 }); }
  if (!input || typeof input !== "object" || !("message" in input) || typeof input.message !== "string") {
    return NextResponse.json({ error: "Invalid chat message" }, { status: 400 });
  }
  const body = input.message.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!body || body.length > MESSAGE_LIMIT) return NextResponse.json({ error: `Messages must be 1–${MESSAGE_LIMIT} characters` }, { status: 400 });

  const now = Date.now();
  const outcome = db.transaction(() => {
    const latest = db.prepare("SELECT created_at AS createdAt FROM global_chat_message WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(user.id) as { createdAt: number } | undefined;
    const recent = (db.prepare("SELECT COUNT(*) AS count FROM global_chat_message WHERE user_id = ? AND created_at > ?").get(user.id, now - POLL_WINDOW_MS) as { count: number }).count;
    const retryAfter = latest ? Math.max(1, Math.ceil((MIN_POST_INTERVAL_MS - (now - latest.createdAt)) / 1000)) : 0;
    if (retryAfter > 0 || recent >= MAX_POSTS_PER_WINDOW) return { blocked: true as const, wait: retryAfter || 10 };

    const result = db.prepare("INSERT INTO global_chat_message (user_id, body, created_at) VALUES (?, ?, ?)").run(user.id, body, now);
    // Bound the public feed history while keeping recent chat available to everyone.
    if (Number(result.lastInsertRowid) % 100 === 0) {
      db.prepare("DELETE FROM global_chat_message WHERE id NOT IN (SELECT id FROM global_chat_message ORDER BY id DESC LIMIT 1000)").run();
    }
    return { blocked: false as const, message: { id: Number(result.lastInsertRowid), userId: user.id, handle: user.displayUsername ?? user.username ?? user.name, body, createdAt: now, own: true } };
  })();

  if (outcome.blocked) {
    const wait = outcome.wait;
    return NextResponse.json({ error: "Slow down a sec before sending again.", retryAfter: wait }, { status: 429, headers: { "Retry-After": String(wait), "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ message: outcome.message }, { headers: { "Cache-Control": "no-store" } });
}
