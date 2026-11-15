import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatFriendCode } from "@/lib/friend-code";
import { getOrCreateFriendCode, requestPolicy, resetFriendCode, resetsLeft, setRequestPolicy } from "@/lib/friends";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Your own friend code and request setting. The code is only ever shown to its owner. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const userId = session.user.id;
  return NextResponse.json({ code: formatFriendCode(getOrCreateFriendCode(userId)), requests: requestPolicy(userId), resetsLeft: resetsLeft(userId) }, { headers: noStore });
}

/** { action: "reset" } makes a new code (the old one stops working). { action: "policy", requests: "code" | "anyone" }. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const userId = session.user.id;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, requests } = body as { action?: unknown; requests?: unknown };
  if (action === "reset") {
    const code = resetFriendCode(userId);
    if (!code) return NextResponse.json({ error: "You can make a new code 5 times a day. Try again tomorrow." }, { status: 429 });
    return NextResponse.json({ code: formatFriendCode(code), requests: requestPolicy(userId), resetsLeft: resetsLeft(userId) }, { headers: noStore });
  }
  if (action === "policy" && (requests === "code" || requests === "anyone")) {
    setRequestPolicy(userId, requests);
    return NextResponse.json({ code: formatFriendCode(getOrCreateFriendCode(userId)), requests, resetsLeft: resetsLeft(userId) }, { headers: noStore });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
