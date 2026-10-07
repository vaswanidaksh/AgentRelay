import { getDb } from '../db.js';

export function showCommand(recordId, options) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);

  if (!row) {
    console.error(`Error: Record not found: ${recordId}`);
    process.exit(1);
  }

  const record = JSON.parse(row.json);

  if (options.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  console.log(`=======================================================`);
  console.log(`Context Record: ${record.recordId} (v${record.version})`);
  console.log(`Schema:         ${record.schemaVersion}`);
  console.log(`Title:          ${record.content.title}`);
  console.log(`Author:         ${record.author.handle} (${record.author.userId})`);
  console.log(`Origin:         ${record.origin} | Project: ${record.acl.projectTag}`);
  console.log(`Shareable:      ${record.visibility.shareable ? 'TRUE (Can be promoted)' : 'FALSE (Private)'}`);
  console.log(`Status:         ${record.feedback.status}`);
  console.log(`=======================================================\n`);

  console.log(`Summary:`);
  console.log(record.content.summary);
  console.log(`\nDecisions (${record.content.decisions.length}):`);
  record.content.decisions.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.text} [Evidence: ${d.evidence.join(', ')}]`);
  });

  if (record.content.filesTouched && record.content.filesTouched.length > 0) {
    console.log(`\nFiles Touched:`);
    record.content.filesTouched.forEach(f => console.log(`  - ${f}`));
  }

  if (record.content.tags && record.content.tags.length > 0) {
    console.log(`\nTags: ${record.content.tags.join(', ')}`);
  }

  if (record.sensitivity.redactionCounts && Object.keys(record.sensitivity.redactionCounts).length > 0) {
    console.log(`\nSecrets Redacted:`);
    for (const [k, v] of Object.entries(record.sensitivity.redactionCounts)) {
      console.log(`  - ${k}: ${v}`);
    }
  }
}
