import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const memberQuery = `SELECT m.user_id AS id, COALESCE(u."displayUsername", u.username, u.name) AS handle,
  m.joined_at AS joinedAt, a.user_id IS NOT NULL AS hasAvatar
  FROM party_member m JOIN user u ON u.id = m.user_id LEFT JOIN player_avatar a ON a.user_id = m.user_id
  WHERE m.party_id = ? ORDER BY m.joined_at, m.user_id`;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const userId = session.user.id;
  const member = db.prepare("SELECT party_id AS partyId FROM party_member WHERE user_id = ?").get(userId) as { partyId: string } | undefined;
  const party = member ? db.prepare("SELECT id, leader_id AS leaderId, created_at AS createdAt FROM game_party WHERE id = ?").get(member.partyId) as { id: string; leaderId: string; createdAt: number } | undefined : undefined;
  const members = member ? db.prepare(memberQuery).all(member.partyId) : [];
  const incoming = db.prepare(`SELECT i.id, i.party_id AS partyId, COALESCE(u."displayUsername",u.username,u.name) AS inviter
    FROM party_invite i JOIN user u ON u.id = i.inviter_id WHERE i.invitee_id = ? ORDER BY i.created_at DESC`).all(userId);
  const outgoing = member ? db.prepare(`SELECT i.id, i.invitee_id AS inviteeId, COALESCE(u."displayUsername",u.username,u.name) AS invitee
    FROM party_invite i JOIN user u ON u.id = i.invitee_id WHERE i.party_id = ? ORDER BY i.created_at`).all(member.partyId) : [];
  const friends = db.prepare(`SELECT u.id, COALESCE(u."displayUsername",u.username,u.name) AS handle, a.user_id IS NOT NULL AS hasAvatar,
    EXISTS(SELECT 1 FROM party_member pm WHERE pm.user_id = u.id) AS inParty,
    EXISTS(SELECT 1 FROM queue_ticket q WHERE q.user_id = u.id) AS queued
    FROM friendship f JOIN user u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END LEFT JOIN player_avatar a ON a.user_id = u.id
    WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
    ORDER BY handle LIMIT 100`).all(userId, userId, userId);
  return NextResponse.json({ party: party ? { ...party, members, isLeader: party.leaderId === userId } : null, incoming, outgoing, friends }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const action = body && typeof body === "object" && "action" in body ? body.action : null;
  const targetId = body && typeof body === "object" && "targetId" in body ? body.targetId : null;
  const inviteId = body && typeof body === "object" && "inviteId" in body ? body.inviteId : null;
  const userId = session.user.id;
  const now = Date.now();

  if (action === "invite") {
    if (typeof targetId !== "string" || targetId === userId) return NextResponse.json({ error: "Choose a friend to invite." }, { status: 400 });
    const result = db.transaction(() => {
      if (!db.prepare("SELECT 1 FROM friendship WHERE user_a = min(?, ?) AND user_b = max(?, ?) AND status = 'accepted'").get(userId, targetId, userId, targetId)) return "You can only invite friends.";
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE user_id = ?").get(userId)) return "Leave the queue before changing your party.";
      if (db.prepare("SELECT 1 FROM party_member WHERE user_id = ?").get(targetId)) return "That friend is already in another party.";
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE user_id = ?").get(targetId)) return "That friend needs to leave their queue first.";
      let party = db.prepare("SELECT p.id, p.leader_id AS leaderId FROM game_party p JOIN party_member m ON m.party_id = p.id WHERE m.user_id = ?").get(userId) as { id: string; leaderId: string } | undefined;
      if (party && party.leaderId !== userId) return "Only the party leader can invite players.";
      if (party && (db.prepare("SELECT COUNT(*) AS count FROM party_member WHERE party_id = ?").get(party.id) as { count: number }).count >= 3) return "Your party is full.";
      if (!party) {
        const id = randomUUID();
        db.prepare("INSERT INTO game_party (id, leader_id, created_at) VALUES (?, ?, ?)").run(id, userId, now);
        db.prepare("INSERT INTO party_member (party_id, user_id, joined_at) VALUES (?, ?, ?)").run(id, userId, now);
        party = { id, leaderId: userId };
      }
      if (db.prepare("SELECT 1 FROM party_member WHERE party_id = ? AND user_id = ?").get(party.id, targetId)) return "That friend is already in your party.";
      const existing = db.prepare("SELECT id FROM party_invite WHERE party_id = ? AND invitee_id = ?").get(party.id, targetId) as { id: string } | undefined;
      const id = existing?.id ?? randomUUID();
      if (!existing) db.prepare("INSERT INTO party_invite (id, party_id, inviter_id, invitee_id, created_at) VALUES (?, ?, ?, ?, ?) ").run(id, party.id, userId, targetId, now);
      return { partyId: party.id, inviteId: id };
    })();
    if (typeof result === "string") return NextResponse.json({ error: result }, { status: 409 });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "accept") {
    if (typeof inviteId !== "string") return NextResponse.json({ error: "Invalid party invite." }, { status: 400 });
    const result = db.transaction(() => {
      if (db.prepare("SELECT 1 FROM party_member WHERE user_id = ?").get(userId)) return "Leave your current party first.";
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE user_id = ?").get(userId)) return "Leave the queue before joining a party.";
      const invite = db.prepare("SELECT party_id AS partyId, inviter_id AS inviterId FROM party_invite WHERE id = ? AND invitee_id = ?").get(inviteId, userId) as { partyId: string; inviterId: string } | undefined;
      if (!invite) return "That invite has expired.";
      if (!db.prepare("SELECT 1 FROM game_party WHERE id = ?").get(invite.partyId)) return "That party no longer exists.";
      const friendship = db.prepare(`SELECT 1 FROM friendship WHERE user_a = min(?, ?) AND user_b = max(?, ?) AND status = 'accepted'`).get(userId, invite.inviterId, userId, invite.inviterId);
      if (!friendship) return "You need to be friends with the inviter to join their party.";
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE party_id = ? AND status IN ('waiting','found','accepted')").get(invite.partyId)) return "That party is already in a queue.";
      const count = db.prepare("SELECT COUNT(*) AS count FROM party_member WHERE party_id = ?").get(invite.partyId) as { count: number };
      if (count.count >= 3) return "That party is full.";
      db.prepare("INSERT INTO party_member (party_id, user_id, joined_at) VALUES (?, ?, ?)").run(invite.partyId, userId, now);
      db.prepare("DELETE FROM party_invite WHERE invitee_id = ?").run(userId);
      return { partyId: invite.partyId };
    })();
    if (typeof result === "string") return NextResponse.json({ error: result }, { status: 409 });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "decline") {
    if (typeof inviteId !== "string") return NextResponse.json({ error: "Invalid party invite." }, { status: 400 });
    db.prepare("DELETE FROM party_invite WHERE id = ? AND invitee_id = ?").run(inviteId, userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "cancelInvite") {
    if (typeof inviteId !== "string") return NextResponse.json({ error: "Invalid party invite." }, { status: 400 });
    const result = db.prepare(`DELETE FROM party_invite WHERE id = ? AND party_id IN
      (SELECT p.id FROM game_party p WHERE p.leader_id = ?)`).run(inviteId, userId);
    if (!result.changes) return NextResponse.json({ error: "Only the party leader can cancel that invite." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (action === "leave") {
    const result = db.transaction(() => {
      const party = db.prepare("SELECT p.id, p.leader_id AS leaderId FROM game_party p JOIN party_member m ON m.party_id = p.id WHERE m.user_id = ?").get(userId) as { id: string; leaderId: string } | undefined;
      if (!party) return null;
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE user_id = ? AND status IN ('waiting','found','accepted')").get(userId)) return "Leave the queue before leaving your party.";
      db.prepare("DELETE FROM party_member WHERE party_id = ? AND user_id = ?").run(party.id, userId);
      if (party.leaderId === userId) {
        const next = db.prepare("SELECT user_id AS id FROM party_member WHERE party_id = ? ORDER BY joined_at LIMIT 1").get(party.id) as { id: string } | undefined;
        if (next) db.prepare("UPDATE game_party SET leader_id = ? WHERE id = ?").run(next.id, party.id);
        else db.prepare("DELETE FROM game_party WHERE id = ?").run(party.id);
      }
      return null;
    })();
    if (typeof result === "string") return NextResponse.json({ error: result }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (action === "kick") {
    if (typeof targetId !== "string" || targetId === userId) return NextResponse.json({ error: "Choose a party member." }, { status: 400 });
    const result = db.transaction(() => {
      const party = db.prepare("SELECT p.id FROM game_party p JOIN party_member m ON m.party_id = p.id WHERE m.user_id = ? AND p.leader_id = ?").get(userId, userId) as { id: string } | undefined;
      if (!party) return "Only the party leader can remove members.";
      if (db.prepare("SELECT 1 FROM queue_ticket WHERE user_id = ?").get(targetId)) return "Your party is queued. Cancel the queue first.";
      const removed = db.prepare("DELETE FROM party_member WHERE party_id = ? AND user_id = ?").run(party.id, targetId);
      if (!removed.changes) return "That player is not in your party.";
      return null;
    })();
    if (typeof result === "string") return NextResponse.json({ error: result }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown party action." }, { status: 400 });
}
