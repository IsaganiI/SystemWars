import { db } from "@/lib/db";
import { generateFriendCode } from "@/lib/friend-code";

/** Who may send a player a friend request. "code" means only people who know their friend code. */
export type RequestPolicy = "code" | "anyone";

/** Limits that make guessing codes pointless and stop request spam. */
export const FRIEND_LIMITS = {
  failedLookups: 5,
  failedWindowMs: 15 * 60_000,
  lookupsPerHour: 30,
  resetsPerDay: 5,
  pendingIncoming: 50,
} as const;

/** The player's friend code, created the first time it is needed. */
export function getOrCreateFriendCode(userId: string) {
  const existing = db.prepare("SELECT code FROM friend_code WHERE user_id = ?").get(userId) as { code: string } | undefined;
  if (existing) return existing.code;
  return db.transaction(() => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateFriendCode();
      const inserted = db.prepare("INSERT INTO friend_code (user_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").run(userId, code, Date.now());
      if (inserted.changes) return code;
      const raced = db.prepare("SELECT code FROM friend_code WHERE user_id = ?").get(userId) as { code: string } | undefined;
      if (raced) return raced.code;
    }
    throw new Error("Could not create a friend code");
  })();
}

export function resetsLeft(userId: string, now = Date.now()) {
  const used = db.prepare("SELECT COUNT(*) AS count FROM friend_code_event WHERE user_id = ? AND kind = 'reset' AND created_at > ?").get(userId, now - 86_400_000) as { count: number };
  return Math.max(0, FRIEND_LIMITS.resetsPerDay - used.count);
}

/** Replaces the code; the old one stops working at once. Returns null when the daily reset limit is used up. */
export function resetFriendCode(userId: string, now = Date.now()) {
  return db.transaction(() => {
    if (resetsLeft(userId, now) === 0) return null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateFriendCode();
      if (db.prepare("SELECT 1 FROM friend_code WHERE code = ?").get(code)) continue;
      db.prepare("INSERT INTO friend_code (user_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at").run(userId, code, now);
      db.prepare("INSERT INTO friend_code_event (user_id, kind, created_at) VALUES (?, 'reset', ?)").run(userId, now);
      return code;
    }
    throw new Error("Could not create a friend code");
  })();
}

export function requestPolicy(userId: string): RequestPolicy {
  const row = db.prepare("SELECT requests FROM friend_settings WHERE user_id = ?").get(userId) as { requests: RequestPolicy } | undefined;
  return row?.requests ?? "code";
}

export function setRequestPolicy(userId: string, policy: RequestPolicy) {
  db.prepare("INSERT INTO friend_settings (user_id, requests) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET requests = excluded.requests").run(userId, policy);
}

/** Seconds until this player may try another code, or 0 if they may try now. */
export function lookupWaitSeconds(userId: string, now = Date.now()) {
  const failed = db.prepare("SELECT created_at FROM friend_code_event WHERE user_id = ? AND kind = 'lookup_fail' AND created_at > ? ORDER BY created_at")
    .all(userId, now - FRIEND_LIMITS.failedWindowMs) as { created_at: number }[];
  let wait = 0;
  if (failed.length >= FRIEND_LIMITS.failedLookups) wait = failed[failed.length - FRIEND_LIMITS.failedLookups].created_at + FRIEND_LIMITS.failedWindowMs - now;
  const all = db.prepare("SELECT created_at FROM friend_code_event WHERE user_id = ? AND kind IN ('lookup_ok', 'lookup_fail') AND created_at > ? ORDER BY created_at")
    .all(userId, now - 3_600_000) as { created_at: number }[];
  if (all.length >= FRIEND_LIMITS.lookupsPerHour) wait = Math.max(wait, all[all.length - FRIEND_LIMITS.lookupsPerHour].created_at + 3_600_000 - now);
  return Math.max(0, Math.ceil(wait / 1000));
}

/** Looks a code up and records the attempt for rate limiting. Returns the owner's id, or null. */
export function lookupFriendCode(userId: string, code: string, now = Date.now()) {
  const owner = db.prepare("SELECT user_id FROM friend_code WHERE code = ?").get(code) as { user_id: string } | undefined;
  db.prepare("INSERT INTO friend_code_event (user_id, kind, created_at) VALUES (?, ?, ?)").run(userId, owner ? "lookup_ok" : "lookup_fail", now);
  db.prepare("DELETE FROM friend_code_event WHERE created_at < ?").run(now - 2 * 86_400_000);
  return owner?.user_id ?? null;
}

export function pendingIncomingCount(userId: string) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM friendship WHERE status = 'pending' AND requested_by != ? AND (user_a = ? OR user_b = ?)").get(userId, userId, userId) as { count: number };
  return row.count;
}
