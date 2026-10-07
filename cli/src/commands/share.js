import { getDb } from '../db.js';

export function shareCommand(recordId) {
  setShareableFlag(recordId, true);
}

export function unshareCommand(recordId) {
  setShareableFlag(recordId, false);
}

function setShareableFlag(recordId, shareable) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);

  if (!row) {
    console.error(`Error: Record not found: ${recordId}`);
    process.exit(1);
  }

  const record = JSON.parse(row.json);

  if (record.feedback.status === 'rejected') {
    console.error(`Error: Cannot share a rejected record: ${recordId}`);
    process.exit(1);
  }

  record.visibility.shareable = shareable;

  db.prepare(`
    UPDATE records SET shareable = ?, json = ? WHERE record_id = ? AND version = ?
  `).run(shareable ? 1 : 0, JSON.stringify(record), record.recordId, record.version);

  console.log(`✔ Record ${recordId} shareable flag updated to: ${shareable ? 'TRUE' : 'FALSE'}`);
}
