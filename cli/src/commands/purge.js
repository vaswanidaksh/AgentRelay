import { getDb } from '../db.js';

export function purgeCommand(options) {
  const db = getDb();

  if (options.events) {
    const res = db.prepare('DELETE FROM events').run();
    console.log(`✔ Purged ${res.changes} local event records.`);
  } else if (options.all) {
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM jobs').run();
    db.prepare('DELETE FROM records').run();
    db.prepare('DELETE FROM capture_offsets').run();
    db.prepare('DELETE FROM feedback_log').run();
    try {
      db.prepare('DELETE FROM records_fts').run();
    } catch {
      // ignore
    }
    console.log('✔ Purged all local AgentRelay data (sessions, events, records, jobs).');
  } else {
    console.log('Usage: agentrelay purge --events OR agentrelay purge --all');
  }
}
