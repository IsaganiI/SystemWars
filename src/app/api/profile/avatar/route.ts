import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const maxUploadBytes = 3 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const row = db.prepare("SELECT image FROM player_avatar WHERE user_id = ?").get(id) as { image: Buffer } | undefined;
  if (!row) return NextResponse.redirect(new URL("/default-avatar.svg", request.url), { headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(row.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxUploadBytes + 2048) return NextResponse.json({ error: "Choose a photo under 3 MB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Could not read that photo." }, { status: 400 }); }
  const file = form.get("avatar");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) return NextResponse.json({ error: "Choose a JPG, PNG, or WebP photo." }, { status: 400 });
  if (!file.size || file.size > maxUploadBytes) return NextResponse.json({ error: "Choose a photo under 3 MB." }, { status: 413 });
  try {
    const image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000, failOn: "error" })
      .rotate().resize(256, 256, { fit: "cover", position: "attention" }).webp({ quality: 85 }).toBuffer();
    db.prepare("INSERT INTO player_avatar (user_id, image, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET image = excluded.image, updated_at = excluded.updated_at")
      .run(id, image, Date.now());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "That photo could not be opened. Choose another." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  db.prepare("DELETE FROM player_avatar WHERE user_id = ?").run(id);
  return NextResponse.json({ ok: true });
}
