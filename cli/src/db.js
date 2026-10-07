import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getAgentRelayDir } from './config.js';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dir = getAgentRelayDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const dbPath = path.join(dir, 'db.sqlite');
  const db = new Database(dbPath);

  // Enable WAL mode for high performance concurrency
  db.pragma('journal_mode = WAL');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      source_path_hash TEXT NOT NULL,
      project_tag TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'CAPTURING',
      started_at TEXT NOT NULL,
      last_event_at TEXT NOT NULL,
      adapter_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      ts TEXT NOT NULL,
      kind TEXT NOT NULL,
      text_scrubbed TEXT NOT NULL,
      redaction_counts TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      UNIQUE(session_id, seq)
    );

    CREATE TABLE IF NOT EXISTS capture_offsets (
      source_path_hash TEXT PRIMARY KEY,
      byte_offset INTEGER NOT NULL DEFAULT 0,
      inode INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'DISTILL',
      state TEXT NOT NULL DEFAULT 'QUEUED',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error_code TEXT,
      run_after TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      record_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      schema_version TEXT NOT NULL,
      json TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'local',
      author_id TEXT NOT NULL,
      project_tag TEXT NOT NULL,
      shareable INTEGER NOT NULL DEFAULT 0,
      feedback_status TEXT NOT NULL DEFAULT 'unreviewed',
      sensitivity TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      PRIMARY KEY (record_id, version)
    );

    CREATE TABLE IF NOT EXISTS feedback_log (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      edit_summary TEXT,
      ts TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_cursor (
      team_id TEXT PRIMARY KEY,
      cursor INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Try initializing FTS5 table for full-text search
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
        record_id UNINDEXED,
        title,
        summary,
        decisions,
        tags,
        project_tag
      );
    `);
  } catch (err) {
    // If FTS5 is unavailable in current sqlite build, fallback gracefully
    console.warn('SQLite FTS5 warning:', err.message);
  }

  dbInstance = db;
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
