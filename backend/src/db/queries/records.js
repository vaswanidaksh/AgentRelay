import { getDb } from '../connection.js';

/**
 * Upserts a promoted record idempotently on (team_id, record_id, version).
 */
export function upsertPromotedRecord({
  recordId,
  version,
  teamId,
  authorId,
  projectTag,
  schemaVersion,
  json,
  sensitivity,
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO records (
      record_id, version, team_id, author_id, project_tag,
      schema_version, json, sensitivity, promoted_at, withdrawn_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)
    ON CONFLICT (team_id, record_id, version) DO UPDATE SET
      json = excluded.json,
      sensitivity = excluded.sensitivity,
      withdrawn_at = NULL
    RETURNING seq, record_id, version, team_id, author_id, project_tag, schema_version, json, sensitivity, promoted_at, withdrawn_at
  `);

  return stmt.get(
    recordId,
    version,
    teamId,
    authorId,
    projectTag,
    schemaVersion,
    typeof json === 'string' ? json : JSON.stringify(json),
    sensitivity
  );
}

/**
 * Pulls records for a team incrementally after a given sequence cursor.
 */
export function pullRecords({ teamId, since = 0, limit = 50 }) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT seq, record_id, version, team_id, author_id, project_tag,
           schema_version, json, sensitivity, promoted_at, withdrawn_at
    FROM records
    WHERE team_id = ? AND seq > ?
    ORDER BY seq ASC
    LIMIT ?
  `).all(teamId, since, limit);

  return rows.map(r => ({
    seq: r.seq,
    recordId: r.record_id,
    version: r.version,
    teamId: r.team_id,
    authorId: r.author_id,
    projectTag: r.project_tag,
    schemaVersion: r.schema_version,
    sensitivity: r.sensitivity,
    promotedAt: r.promoted_at,
    withdrawnAt: r.withdrawn_at,
    withdrawn: Boolean(r.withdrawn_at),
    isWithdrawn: Boolean(r.withdrawn_at),
    record: JSON.parse(r.json)
  }));
}

/**
 * Fetches the latest non-withdrawn version of a record in a team.
 */
export function getRecord(teamId, recordId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT seq, record_id, version, team_id, author_id, project_tag,
           schema_version, json, sensitivity, promoted_at, withdrawn_at
    FROM records
    WHERE team_id = ? AND record_id = ? AND withdrawn_at IS NULL
    ORDER BY version DESC
    LIMIT 1
  `).get(teamId, recordId);

  if (!row) return null;

  return {
    ...row,
    record: JSON.parse(row.json)
  };
}

/**
 * Marks a record as withdrawn (tombstone) in a team.
 * Advances seq so incremental pull cursors pick up the tombstone.
 */
export function withdrawRecord(teamId, recordId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT seq FROM records
    WHERE team_id = ? AND record_id = ? AND withdrawn_at IS NULL
  `).all(teamId, recordId);

  if (rows.length === 0) return false;

  const maxSeqRow = db.prepare('SELECT COALESCE(MAX(seq), 0) AS maxSeq FROM records').get();
  let nextSeq = (maxSeqRow?.maxSeq || 0) + 1;

  const updateStmt = db.prepare(`
    UPDATE records
    SET withdrawn_at = datetime('now'),
        seq = ?
    WHERE seq = ?
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      updateStmt.run(nextSeq++, r.seq);
    }
  });
  tx();

  return true;
}
