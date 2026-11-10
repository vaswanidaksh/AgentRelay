import fs from 'fs';
import path from 'path';
import { getDb } from '../db.js';
import { getAgentRelayDir } from '../config.js';

/**
 * Generates a clean Markdown context pack string for a given record.
 * @param {object} record Context record
 * @param {Array} events Optional array of events
 * @returns {string} Markdown text
 */
export function formatRecordToMarkdown(record, events = []) {
  const content = record.content || {};
  const author = record.author || {};
  const acl = record.acl || {};
  const times = record.times || {};

  return `# Context Pack: ${content.title || 'Untitled Session'}

**Record ID:** \`${record.recordId}\` (v${record.version || 1})  
**Author:** ${author.handle || '@team'} (\`${author.userId || 'unknown'}\`)  
**Project:** \`${acl.projectTag || 'global'}\`  
**Agent:** ${record.source?.agent || 'cli'}  
**Created At:** ${times.createdAt || new Date().toISOString()}  
**Origin:** ${record.origin || 'team'}  

---

## 📋 Executive Summary
${content.summary || 'No summary available.'}

---

## 💡 Key Architectural & Implementation Decisions
${(content.decisions || []).map((d, i) => `### ${i + 1}. ${d.text}
- **Evidence Citations:** ${(d.evidence || []).map(e => `\`${e}\``).join(', ')}
`).join('\n')}

---

## 📁 Code Files Touched
${(content.filesTouched || []).length > 0
  ? content.filesTouched.map(f => `- \`${f}\``).join('\n')
  : '_No files touched recorded._'}

---

## ❓ Open Questions & Follow-ups
${(content.openQuestions || []).length > 0
  ? content.openQuestions.map(q => `- ${q}`).join('\n')
  : '_None_'}

${events.length > 0 ? `---

## 💬 Session Chat & Tool Events Slice (${events.length} events)
\`\`\`text
${events.map(e => `[${e.id}] (${e.kind}) ${e.ts}: ${e.text_scrubbed}`).join('\n')}
\`\`\`
` : ''}
`;
}

/**
 * Exports all context records in SQLite to a destination directory and generates
 * a master CONTEXT.md index file that AI coding agents can read.
 * 
 * @param {string} targetDir Destination folder (defaults to ~/.agentrelay/context)
 * @param {object} options
 * @returns {object} Summary of exported files
 */
export function syncGlobalContextFiles(targetDir = null, options = {}) {
  const db = getDb();
  const baseDir = targetDir || path.join(getAgentRelayDir(), 'context');

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const rows = db.prepare('SELECT * FROM records ORDER BY created_at DESC').all();
  if (rows.length === 0) {
    return { count: 0, dir: baseDir, indexFile: null };
  }

  const allFilesTouched = new Set();
  const summaryEntries = [];

  for (const row of rows) {
    try {
      const record = JSON.parse(row.json);
      const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC')
        .all(record.source?.sessionId || '');

      // Track files touched across team
      (record.content?.filesTouched || []).forEach(f => allFilesTouched.add(f));

      // Write individual context pack file
      const packFilename = `record_${record.recordId.slice(0, 8)}.md`;
      const packPath = path.join(baseDir, packFilename);
      const packMd = formatRecordToMarkdown(record, events);
      fs.writeFileSync(packPath, packMd, 'utf-8');

      summaryEntries.push({
        id: record.recordId,
        shortId: record.recordId.slice(0, 8),
        title: record.content?.title || 'Untitled Record',
        summary: record.content?.summary || '',
        author: record.author?.handle || '@team',
        agent: record.source?.agent || 'cli',
        project: record.acl?.projectTag || 'global',
        date: record.times?.createdAt ? new Date(record.times.createdAt).toLocaleDateString() : 'Recently',
        decisionsCount: (record.content?.decisions || []).length,
        files: record.content?.filesTouched || [],
        filename: packFilename,
      });
    } catch (e) {
      // skip corrupted row
    }
  }

  // Generate Master Consolidated INDEX.md / CONTEXT.md
  const masterContext = `# AgentRelay — Global Team Context & Decision Memory

> This file is automatically maintained by **AgentRelay**. It aggregates shared team context, 
> past AI coding session decisions, and code files touched across the repository.
> Coding agents (Claude Code, Cursor, Windsurf, Aider) should consult this file for context.

---

## 🌐 Global Code Files Referenced Across Sessions (${allFilesTouched.size} files)
${allFilesTouched.size > 0
  ? Array.from(allFilesTouched).sort().map(f => `- \`${f}\``).join('\n')
  : '_No files touched recorded yet._'}

---

## 📚 Team Sessions & Decisions Catalog (${summaryEntries.length} records)

${summaryEntries.map(s => `### [${s.shortId}] ${s.title}
- **Author:** ${s.author} | **Agent:** ${s.agent} | **Project:** \`${s.project}\` | **Date:** ${s.date}
- **Summary:** ${s.summary}
- **Key Decisions:** ${s.decisionsCount} decision(s) recorded.
- **Touched Files:** ${s.files.map(f => `\`${f}\``).join(', ') || 'None'}
- **Detailed Pack:** [${s.filename}](./${s.filename})
`).join('\n')}

---

## 🤖 Instructions for AI Coding Agents
1. Before proposing architecture changes or editing shared logic, check the decisions catalog above.
2. If working on any file in the **Global Code Files Referenced** list, inspect the corresponding detailed context pack to understand past rationale.
3. Do not re-explore dead ends that were rejected in past recorded decisions.
`;

  const indexFilePath = path.join(baseDir, 'CONTEXT.md');
  fs.writeFileSync(indexFilePath, masterContext, 'utf-8');

  // Also write to current working directory if inside an initialized project
  let localProjectPath = null;
  const cwd = process.cwd();
  const cwdAgentRelay = path.join(cwd, '.agentrelay');
  if (fs.existsSync(cwdAgentRelay) || options.writeCwd) {
    if (!fs.existsSync(cwdAgentRelay)) fs.mkdirSync(cwdAgentRelay, { recursive: true });
    localProjectPath = path.join(cwdAgentRelay, 'CONTEXT.md');
    fs.writeFileSync(localProjectPath, masterContext, 'utf-8');
  }

  return {
    count: summaryEntries.length,
    dir: baseDir,
    indexFile: indexFilePath,
    localProjectFile: localProjectPath,
    filesTouchedCount: allFilesTouched.size
  };
}
