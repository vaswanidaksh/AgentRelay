import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

export function reviewCommand(options) {
  const db = getDb();
  const candidates = db.prepare(`
    SELECT * FROM records WHERE feedback_status = 'unreviewed' ORDER BY created_at ASC
  `).all();

  if (candidates.length === 0) {
    console.log('No candidate records awaiting review.');
    return;
  }

  console.log(`Found ${candidates.length} record(s) awaiting review:\n`);

  for (const candidateRow of candidates) {
    const record = JSON.parse(candidateRow.json);
    console.log(`-------------------------------------------------------`);
    console.log(`Record ID: ${record.recordId} (v${record.version})`);
    console.log(`Title:     ${record.content.title}`);
    console.log(`Project:   ${record.acl.projectTag}`);
    console.log(`Summary:   ${record.content.summary}`);
    console.log(`-------------------------------------------------------`);

    if (options.accept) {
      acceptRecord(db, record);
    } else if (options.reject) {
      rejectRecord(db, record);
    } else {
      // Default to accept action in batch/scripted review
      acceptRecord(db, record);
    }
  }
}

function acceptRecord(db, record) {
  const now = new Date().toISOString();
  record.feedback.status = 'accepted';
  record.feedback.reviewedAt = now;

  db.prepare(`
    UPDATE records SET feedback_status = 'accepted', json = ? WHERE record_id = ? AND version = ?
  `).run(JSON.stringify(record), record.recordId, record.version);

  db.prepare(`
    INSERT INTO feedback_log (id, record_id, version, action, ts)
    VALUES (?, ?, ?, 'accept', ?)
  `).run(uuidv4(), record.recordId, record.version, now);

  console.log(`✔ Accepted record ${record.recordId} -> Status set to PERSONAL (private).`);
}

function rejectRecord(db, record) {
  const now = new Date().toISOString();
  record.feedback.status = 'rejected';
  record.feedback.reviewedAt = now;

  db.prepare(`
    UPDATE records SET feedback_status = 'rejected', json = ? WHERE record_id = ? AND version = ?
  `).run(JSON.stringify(record), record.recordId, record.version);

  db.prepare(`
    INSERT INTO feedback_log (id, record_id, version, action, ts)
    VALUES (?, ?, ?, 'reject', ?)
  `).run(uuidv4(), record.recordId, record.version, now);

  console.log(`✖ Rejected record ${record.recordId}. Removed from search and promotion.`);
}
