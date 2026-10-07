import fs from 'fs';
import path from 'path';
import { getDb } from '../db.js';

export function exportCommand(recordId, options) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);

  if (!row) {
    console.error(`Error: Record not found: ${recordId}`);
    process.exit(1);
  }

  const record = JSON.parse(row.json);
  const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC').all(record.source.sessionId);

  const markdown = `# Context Pack: ${record.content.title}

**Record ID:** \`${record.recordId}\` (v${record.version})  
**Author:** ${record.author.handle} (\`${record.author.userId}\`)  
**Project:** \`${record.acl.projectTag}\`  
**Created At:** ${record.times.createdAt}  
**Origin:** ${record.origin}  

---

## Summary
${record.content.summary}

---

## Key Decisions & Evidence
${record.content.decisions.map((d, i) => `### ${i + 1}. ${d.text}
- **Cited Evidence Events:** ${d.evidence.map(e => `\`${e}\``).join(', ')}
`).join('\n')}

---

## Files Touched
${(record.content.filesTouched || []).map(f => `- \`${f}\``).join('\n')}

---

## Open Questions
${(record.content.openQuestions || []).map(q => `- ${q}`).join('\n') || '_None_'}

---

## Session Evidence Slice (${events.length} events)
\`\`\`text
${events.map(e => `[${e.id}] (${e.kind}) ${e.ts}: ${e.text_scrubbed}`).join('\n')}
\`\`\`
`;

  const filename = `context_pack_${record.recordId.substring(0, 8)}.md`;
  const outPath = path.resolve(filename);
  fs.writeFileSync(outPath, markdown, 'utf-8');

  console.log(`✔ Exported Markdown Context Pack to: ${outPath}`);
}
