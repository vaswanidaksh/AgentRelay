import { getDb } from '../connection.js';
import { v4 as uuidv4 } from 'uuid';

export function logAuditEvent({ actorId, action, teamId, recordId = null, metadata = {} }) {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO audit_events (id, actor_id, action, team_id, record_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    actorId,
    action,
    teamId,
    recordId,
    typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
  );
  return id;
}

export function listAuditEventsForTeam(teamId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM audit_events
    WHERE team_id = ?
    ORDER BY ts DESC
    LIMIT ?
  `).all(teamId, limit);
}
