import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const databasePath = resolve(process.cwd(), process.env.SYSTEMWARS_DB_PATH ?? ".data/systemwars.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
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
    queued_at INTEGER NOT NULL,
    seen_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS queue_waiting_by_mode ON queue_ticket (mode, status, queued_at);
  CREATE TABLE IF NOT EXISTS match_design (
    match_id TEXT NOT NULL,
    team INTEGER NOT NULL,
    components TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submitted_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, team)
  );
  CREATE TABLE IF NOT EXISTS player_rating (
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('1v1', '2v2', '3v3')),
    rating INTEGER NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, mode)
  );
`);

export function getPlayerProfile(userId: string) {
  return db.prepare("SELECT preferred_mode AS preferredMode FROM player_profile WHERE user_id = ?")
    .get(userId) as { preferredMode: "1v1" | "2v2" | "3v3" } | undefined;
}
