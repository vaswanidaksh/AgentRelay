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

  // Add performance indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_state_run ON jobs(state, run_after);
    CREATE INDEX IF NOT EXISTS idx_records_shareable ON records(shareable);
    CREATE INDEX IF NOT EXISTS idx_records_project ON records(project_tag);
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

/**
 * Saves a context record object into SQLite and updates the FTS index.
 */
export function saveRecord(record) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO records (
      record_id, version, schema_version, json, origin, author_id, project_tag,
      shareable, feedback_status, sensitivity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(record_id, version) DO UPDATE SET
      json = excluded.json,
      shareable = excluded.shareable,
      feedback_status = excluded.feedback_status,
      sensitivity = excluded.sensitivity
  `);

  stmt.run(
    record.recordId,
    record.version,
    record.schemaVersion,
    JSON.stringify(record),
    record.origin || 'local',
    record.author?.userId || 'local_user',
    record.acl?.projectTag || record.source?.projectTag || 'default',
    record.visibility?.shareable ? 1 : 0,
    record.feedback?.status || 'unreviewed',
    record.sensitivity?.label || 'none',
    record.times?.createdAt || new Date().toISOString()
  );

  try {
    db.prepare(`
      INSERT INTO records_fts (record_id, title, summary, decisions, tags, project_tag)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.recordId,
      record.content?.title || '',
      record.content?.summary || '',
      JSON.stringify(record.content?.decisions || []),
      (record.content?.tags || []).join(' '),
      record.acl?.projectTag || record.source?.projectTag || ''
    );
  } catch {
    // ignore FTS fallback
  }
}

/**
 * Retrieves a record by ID.
 */
export function getRecordById(recordId) {
  const db = getDb();
  const row = db.prepare('SELECT json FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);
  if (!row) return null;
  return JSON.parse(row.json);
}

/**
 * Searches records in the local store using FTS5 or LIKE fallback.
 */
export function searchLocalRecords(query, limit = 20) {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT r.json FROM records r
      JOIN records_fts f ON r.record_id = f.record_id
      WHERE records_fts MATCH ?
      ORDER BY r.created_at DESC LIMIT ?
    `).all(query, limit);
    return rows.map(row => JSON.parse(row.json));
  } catch {
    const likeQuery = `%${query}%`;
    const rows = db.prepare(`
      SELECT json FROM records
      WHERE json LIKE ?
      ORDER BY created_at DESC LIMIT ?
    `).all(likeQuery, limit);
    return rows.map(row => JSON.parse(row.json));
  }
}
