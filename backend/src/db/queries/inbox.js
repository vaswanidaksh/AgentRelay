import { getDb } from '../connection.js';

/**
 * Creates a new handoff entry in the inbox.
 */
export function createHandoff({ id, teamId, fromUser, toUser, recordId }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO inbox (id, team_id, from_user, to_user, record_id, state, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(id, teamId, fromUser, toUser, recordId);

  return getHandoffById(id);
}

/**
 * Retrieves a handoff entry by ID.
 */
export function getHandoffById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT i.id, i.team_id, i.from_user, i.to_user, i.record_id, i.state, i.created_at,
           t.name as team_name,
           u_from.handle as from_handle,
           u_to.handle as to_handle
    FROM inbox i
    JOIN teams t ON i.team_id = t.id
    JOIN users u_from ON i.from_user = u_from.id
    JOIN users u_to ON i.to_user = u_to.id
    WHERE i.id = ?
  `).get(id);
}

/**
 * Lists inbox entries for a user, with sender info, team name, and record details.
 */
export function listInboxForUser(userId, state = null) {
  const db = getDb();
  let query = `
    SELECT i.id, i.team_id, i.from_user, i.to_user, i.record_id, i.state, i.created_at,
           t.name as team_name,
           u_from.handle as from_handle,
           r.json as record_json
    FROM inbox i
    JOIN teams t ON i.team_id = t.id
    JOIN users u_from ON i.from_user = u_from.id
    LEFT JOIN records r ON (
      r.team_id = i.team_id AND
      r.record_id = i.record_id AND
      r.withdrawn_at IS NULL AND
      r.version = (
        SELECT MAX(r2.version) FROM records r2
        WHERE r2.team_id = i.team_id AND r2.record_id = i.record_id AND r2.withdrawn_at IS NULL
      )
    )
    WHERE i.to_user = ?
  `;

  const params = [userId];
  if (state) {
    query += ' AND i.state = ?';
    params.push(state);
  }

  query += ' ORDER BY i.created_at DESC';

  const rows = db.prepare(query).all(...params);

  return rows.map(row => {
    let recordSummary = null;
    if (row.record_json) {
      try {
        const parsed = JSON.parse(row.record_json);
        recordSummary = {
          title: parsed.content?.title || 'Untitled',
          summary: parsed.content?.summary || '',
          version: parsed.version
        };
      } catch (e) {}
    }

    return {
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_name,
      fromUser: row.from_user,
      fromHandle: row.from_handle,
      recordId: row.record_id,
      state: row.state,
      createdAt: row.created_at,
      record: recordSummary
    };
  });
}

/**
 * Updates the status of an inbox item (e.g., pending -> read -> archived).
 */
export function updateHandoffState(id, userId, newState) {
  const db = getDb();
  const info = db.prepare(`
    UPDATE inbox
    SET state = ?
    WHERE id = ? AND to_user = ?
  `).run(newState, id, userId);

  if (info.changes === 0) {
    return null;
  }

  return getHandoffById(id);
}
