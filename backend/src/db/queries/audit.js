import crypto from 'crypto';
import { getDb } from '../connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tamper-evident audit log (PRD §14.2, §20).
 *
 * Each team's audit events form a SHA-256 hash chain: every event stores the
 * hash of the previous event in the same team (`prev_hash`) and its own hash
 * computed over its contents + prev_hash. Editing, deleting or reordering any
 * historical row breaks the chain, which `verifyAuditChain` detects.
 */

export const GENESIS_HASH = 'GENESIS';

export function computeAuditHash({ prevHash, id, actorId, action, teamId, recordId, metadata, ts }) {
  // Array form gives a stable, unambiguous canonical encoding.
  const canonical = JSON.stringify([
    prevHash, id, actorId, action, teamId, recordId ?? null, metadata ?? null, ts
  ]);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function logAuditEvent({ actorId, action, teamId, recordId = null, metadata = {} }) {
  const db = getDb();
  const id = uuidv4();
  const ts = new Date().toISOString();
  const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

  // better-sqlite3 transactions are synchronous, so read-prev + insert is atomic.
  const append = db.transaction(() => {
    const prev = db.prepare(`
      SELECT hash FROM audit_events
      WHERE team_id = ? AND hash IS NOT NULL
      ORDER BY rowid DESC LIMIT 1
    `).get(teamId);
    const prevHash = prev?.hash ?? GENESIS_HASH;

    const hash = computeAuditHash({
      prevHash, id, actorId, action, teamId, recordId, metadata: metadataStr, ts
    });

    db.prepare(`
      INSERT INTO audit_events (id, actor_id, action, team_id, record_id, metadata, ts, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, actorId, action, teamId, recordId, metadataStr, ts, prevHash, hash);
  });

  append();
  return id;
}

function parseMetadata(raw) {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Lists audit events for a team, newest first, with optional filters and
 * keyset pagination via `before` (an opaque sequence cursor).
 */
export function listAuditEventsForTeam(teamId, { action, recordId, actorId, before, limit = 50 } = {}) {
  const db = getDb();
  const where = ['a.team_id = ?'];
  const params = [teamId];

  if (action) { where.push('a.action = ?'); params.push(action); }
  if (recordId) { where.push('a.record_id = ?'); params.push(recordId); }
  if (actorId) { where.push('a.actor_id = ?'); params.push(actorId); }
  if (before) { where.push('a.rowid < ?'); params.push(before); }

  params.push(limit);

  const rows = db.prepare(`
    SELECT a.rowid AS seq, a.id, a.actor_id, u.handle AS actor_handle, a.action,
           a.team_id, a.record_id, a.metadata, a.ts, a.hash
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.actor_id
    WHERE ${where.join(' AND ')}
    ORDER BY a.rowid DESC
    LIMIT ?
  `).all(...params);

  return rows.map(r => ({
    seq: r.seq,
    id: r.id,
    actorId: r.actor_id,
    actorHandle: r.actor_handle,
    action: r.action,
    teamId: r.team_id,
    recordId: r.record_id,
    metadata: parseMetadata(r.metadata),
    ts: r.ts,
    hash: r.hash
  }));
}

/**
 * Re-walks a team's chain from the start and reports the first break, if any.
 * Rows written before hash-chaining existed (hash IS NULL) are counted as
 * legacy and skipped; they are not covered by the integrity guarantee.
 */
export function verifyAuditChain(teamId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT rowid AS seq, id, actor_id, action, team_id, record_id, metadata, ts, prev_hash, hash
    FROM audit_events
    WHERE team_id = ?
    ORDER BY rowid ASC
  `).all(teamId);

  let expectedPrev = GENESIS_HASH;
  let checked = 0;
  let legacy = 0;

  for (const row of rows) {
    if (row.hash == null) {
      legacy += 1;
      continue;
    }

    if (row.prev_hash !== expectedPrev) {
      return { valid: false, checked, legacy, brokenAt: { seq: row.seq, id: row.id, reason: 'PREV_HASH_MISMATCH' } };
    }

    const recomputed = computeAuditHash({
      prevHash: row.prev_hash,
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      teamId: row.team_id,
      recordId: row.record_id,
      metadata: row.metadata,
      ts: row.ts
    });

    if (recomputed !== row.hash) {
      return { valid: false, checked, legacy, brokenAt: { seq: row.seq, id: row.id, reason: 'CONTENT_HASH_MISMATCH' } };
    }

    expectedPrev = row.hash;
    checked += 1;
  }

  return { valid: true, checked, legacy, headHash: checked > 0 ? expectedPrev : null };
}
