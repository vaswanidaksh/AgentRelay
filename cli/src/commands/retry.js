import { getDb } from '../db.js';

export function retryCommand(sessionId) {
  const db = getDb();
  let result;

  if (sessionId) {
    result = db.prepare(`
      UPDATE jobs SET state = 'QUEUED', run_after = ?
      WHERE session_id = ? AND state IN ('DISTILL_FAILED', 'FAILED')
    `).run(new Date().toISOString(), sessionId);
    db.prepare("UPDATE sessions SET state = 'QUEUED' WHERE id = ?").run(sessionId);
  } else {
    result = db.prepare(`
      UPDATE jobs SET state = 'QUEUED', run_after = ?
      WHERE state IN ('DISTILL_FAILED', 'FAILED')
    `).run(new Date().toISOString());
    db.prepare("UPDATE sessions SET state = 'QUEUED' WHERE state = 'DISTILL_FAILED'").run();
  }

  console.log(`✔ Re-queued ${result.changes} failed distillation job(s).`);
}
