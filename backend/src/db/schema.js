import { getDb } from './connection.js';

/**
 * Initializes the SQLite schema for the Local Context Protocol (LCP) server (PRD §14.2).
 */
export function initializeSchema(database) {
  const db = database || getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      github_id   TEXT UNIQUE,
      handle      TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      token_hash    TEXT NOT NULL UNIQUE,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at  TEXT,
      revoked_at    TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teams (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_by  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS memberships (
      team_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invites (
      id          TEXT PRIMARY KEY,
      team_id     TEXT NOT NULL,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      max_uses    INTEGER NOT NULL DEFAULT 1,
      uses        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS records (
      seq             INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id       TEXT NOT NULL,
      version         INTEGER NOT NULL,
      team_id         TEXT NOT NULL,
      author_id       TEXT NOT NULL,
      project_tag     TEXT NOT NULL,
      schema_version  TEXT NOT NULL,
      json            TEXT NOT NULL,
      sensitivity     TEXT NOT NULL,
      promoted_at     TEXT NOT NULL DEFAULT (datetime('now')),
      withdrawn_at    TEXT,
      UNIQUE (team_id, record_id, version),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_team_seq
      ON records(team_id, seq);

    CREATE INDEX IF NOT EXISTS idx_records_team_record_id
      ON records(team_id, record_id);

    CREATE TABLE IF NOT EXISTS audit_events (
      id         TEXT PRIMARY KEY,
      actor_id   TEXT NOT NULL,
      action     TEXT NOT NULL,
      team_id    TEXT NOT NULL,
      record_id  TEXT,
      metadata   TEXT,
      ts         TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (actor_id) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_team_ts
      ON audit_events(team_id, ts);

    CREATE TABLE IF NOT EXISTS inbox (
      id          TEXT PRIMARY KEY,
      team_id     TEXT NOT NULL,
      from_user   TEXT NOT NULL,
      to_user     TEXT NOT NULL,
      record_id   TEXT NOT NULL,
      state       TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'read', 'archived')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user) REFERENCES users(id),
      FOREIGN KEY (to_user) REFERENCES users(id)
    );
  `);

  console.log('[DB] LCP schema initialized — all 8 server tables ready');
}
