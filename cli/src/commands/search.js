import { getDb } from '../db.js';

export function searchCommand(query, options) {
  const db = getDb();
  let records = [];

  if (!query || query.trim() === '') {
    records = db.prepare('SELECT * FROM records ORDER BY created_at DESC LIMIT 20').all();
  } else {
    try {
      const ftsMatches = db.prepare(`
        SELECT record_id FROM records_fts WHERE records_fts MATCH ? LIMIT 50
      `).all(query);

      if (ftsMatches.length > 0) {
        const ids = ftsMatches.map(m => m.record_id);
        const placeholders = ids.map(() => '?').join(',');
        records = db.prepare(`SELECT * FROM records WHERE record_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids);
      }
    } catch {
      // Fallback SQL LIKE search
      const likePattern = `%${query}%`;
      records = db.prepare(`
        SELECT * FROM records
        WHERE json LIKE ? OR project_tag LIKE ?
        ORDER BY created_at DESC LIMIT 20
      `).all(likePattern, likePattern);
    }
  }

  const parsedRecords = records.map(r => JSON.parse(r.json));

  if (options.json) {
    console.log(JSON.stringify(parsedRecords, null, 2));
    return;
  }

  if (parsedRecords.length === 0) {
    console.log(`No records found matching query "${query || ''}".`);
    return;
  }

  console.log(`Found ${parsedRecords.length} record(s):\n`);
  parsedRecords.forEach((r, idx) => {
    console.log(`[${idx + 1}] Record ID: ${r.recordId} (v${r.version})`);
    console.log(`    Title:   ${r.content.title}`);
    console.log(`    Author:  ${r.author.handle} | Origin: ${r.origin} | Project: ${r.acl.projectTag}`);
    console.log(`    Summary: ${r.content.summary.substring(0, 150)}...`);
    console.log(`    Shareable: ${r.visibility.shareable ? 'Yes' : 'No'} | Status: ${r.feedback.status}\n`);
  });
}
