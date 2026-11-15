import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const databasePath = resolve(process.cwd(), process.env.SYSTEMWARS_DB_PATH ?? ".data/systemwars.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS player_profile (
    user_id TEXT PRIMARY KEY,
    preferred_mode TEXT NOT NULL CHECK (preferred_mode IN ('1v1', '2v2', '3v3')),
    created_at INTEGER NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS game_match (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('1v1', '2v2', '3v3')),
    challenge TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('found', 'ready', 'cancelled', 'completed')),
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS match_player (
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    team INTEGER NOT NULL,
    accepted_at INTEGER,
    PRIMARY KEY (match_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS queue_ticket (
    user_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('1v1', '2v2', '3v3')),
    status TEXT NOT NULL CHECK (status IN ('waiting', 'found', 'accepted', 'cancelled')),
    match_id TEXT,
    party_id TEXT,
    queued_at INTEGER NOT NULL,
    seen_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS queue_waiting_by_mode ON queue_ticket (mode, status, queued_at);
  CREATE TABLE IF NOT EXISTS game_party (
    id TEXT PRIMARY KEY,
    leader_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS party_member (
    party_id TEXT NOT NULL REFERENCES game_party(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL UNIQUE,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (party_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS party_invite (
    id TEXT PRIMARY KEY,
    party_id TEXT NOT NULL REFERENCES game_party(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL,
    invitee_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (party_id, invitee_id)
  );
  CREATE INDEX IF NOT EXISTS party_invite_by_invitee ON party_invite (invitee_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS match_design (
    match_id TEXT NOT NULL,
    team INTEGER NOT NULL,
    components TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submitted_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, team)
  );
  CREATE TABLE IF NOT EXISTS match_veto (
    match_id TEXT PRIMARY KEY,
    first_team INTEGER NOT NULL DEFAULT 0 CHECK (first_team IN (0, 1)),
    turn_team INTEGER NOT NULL CHECK (turn_team IN (0, 1, 2)),
    first_ban TEXT,
    second_ban TEXT,
    selected_scenario TEXT,
    scenario_pool TEXT,
    started_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS match_brief_ready (
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ready_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS player_rating (
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('1v1', '2v2', '3v3')),
    rating INTEGER NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, mode)
  );
  CREATE TABLE IF NOT EXISTS player_avatar (
    user_id TEXT PRIMARY KEY,
    image BLOB NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS match_result (
    match_id TEXT NOT NULL,
    team INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    breakdown TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, team)
  );
  CREATE TABLE IF NOT EXISTS rating_change (
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    before_rating INTEGER NOT NULL,
    after_rating INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS rating_change_by_user ON rating_change (user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS friendship (
    user_a TEXT NOT NULL,
    user_b TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_a, user_b),
    CHECK (user_a < user_b)
  );
  CREATE INDEX IF NOT EXISTS friendship_by_b ON friendship (user_b, status);
  CREATE TABLE IF NOT EXISTS voice_presence (
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    seen_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS voice_signal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('offer', 'answer', 'candidate')),
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS voice_signal_delivery ON voice_signal (match_id, to_user, id);
  CREATE TABLE IF NOT EXISTS global_chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS global_chat_message_by_user ON global_chat_message (user_id, id DESC);
  CREATE TABLE IF NOT EXISTS global_chat_presence (
    user_id TEXT PRIMARY KEY,
    seen_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS global_chat_presence_seen_at ON global_chat_presence (seen_at);
  CREATE TABLE IF NOT EXISTS friend_code (
    user_id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS friend_code_event (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('lookup_ok', 'lookup_fail', 'reset')),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS friend_code_event_by_user ON friend_code_event (user_id, kind, created_at);
  CREATE TABLE IF NOT EXISTS friend_settings (
    user_id TEXT PRIMARY KEY,
    requests TEXT NOT NULL DEFAULT 'code' CHECK (requests IN ('code', 'anyone'))
  );
  CREATE TABLE IF NOT EXISTS match_canvas (
    match_id TEXT NOT NULL,
    team INTEGER NOT NULL,
    document TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, team)
  );
`);
const partyInviteColumns = db.pragma("table_info(party_invite)") as { name: string }[];
if (!partyInviteColumns.some(column => column.name === "id")) {
  db.transaction(() => {
    db.exec("ALTER TABLE party_invite ADD COLUMN id TEXT");
    const invites = db.prepare("SELECT party_id AS partyId, invitee_id AS inviteeId FROM party_invite WHERE id IS NULL")
      .all() as { partyId: string; inviteeId: string }[];
    const assignId = db.prepare("UPDATE party_invite SET id = ? WHERE party_id = ? AND invitee_id = ?");
    for (const invite of invites) assignId.run(randomUUID(), invite.partyId, invite.inviteeId);
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS party_invite_by_id ON party_invite (id)");
  })();
}
if (!(db.pragma("table_info(queue_ticket)") as { name: string }[]).some(column => column.name === "party_id")) {
  db.exec("ALTER TABLE queue_ticket ADD COLUMN party_id TEXT");
}
if (!(db.pragma("table_info(match_design)") as { name: string }[]).some(column => column.name === "design")) {
  db.exec("ALTER TABLE match_design ADD COLUMN design TEXT");
}
if (!(db.pragma("table_info(game_match)") as { name: string }[]).some(column => column.name === "is_test")) {
  db.exec("ALTER TABLE game_match ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0");
}
if (!(db.pragma("table_info(game_match)") as { name: string }[]).some(column => column.name === "is_npc")) {
  db.exec("ALTER TABLE game_match ADD COLUMN is_npc INTEGER NOT NULL DEFAULT 0");
}
if (!(db.pragma("table_info(player_rating)") as { name: string }[]).some(column => column.name === "draws")) {
  db.exec("ALTER TABLE player_rating ADD COLUMN draws INTEGER NOT NULL DEFAULT 0");
}
if (!(db.pragma("table_info(match_veto)") as { name: string }[]).some(column => column.name === "first_team")) {
  db.exec("ALTER TABLE match_veto ADD COLUMN first_team INTEGER NOT NULL DEFAULT 0");
}
if (!(db.pragma("table_info(match_veto)") as { name: string }[]).some(column => column.name === "scenario_pool")) {
  db.exec("ALTER TABLE match_veto ADD COLUMN scenario_pool TEXT");
}
// 1 when the design was locked in by the build clock (auto-submit at 0:00 or an absent team), not by a player.
if (!(db.pragma("table_info(match_design)") as { name: string }[]).some(column => column.name === "auto_submitted")) {
  db.exec("ALTER TABLE match_design ADD COLUMN auto_submitted INTEGER NOT NULL DEFAULT 0");
}

export function getPlayerProfile(userId: string) {
  return db.prepare("SELECT preferred_mode AS preferredMode FROM player_profile WHERE user_id = ?")
    .get(userId) as { preferredMode: "1v1" | "2v2" | "3v3" } | undefined;
}
