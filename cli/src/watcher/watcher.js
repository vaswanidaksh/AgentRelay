import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { loadConfig } from '../config.js';
import { normalizeLineToEvent, detectAgentType, ADAPTER_VERSION } from './adapter.js';

export function hashPath(filePath) {
  return crypto.createHash('sha256').update(path.resolve(filePath)).digest('hex').substring(0, 16);
}

export function scanAndCaptureSessionFiles() {
  const config = loadConfig();
  if (config.paused) {
    return { status: 'PAUSED', capturedEvents: 0 };
  }

  if (!config.scopes || config.scopes.length === 0) {
    return { status: 'NO_SCOPES', capturedEvents: 0 };
  }

  const db = getDb();
  let totalCaptured = 0;

  for (const scopePath of config.scopes) {
    const resolvedPath = path.resolve(scopePath);
    if (!fs.existsSync(resolvedPath)) continue;

    const sessionFiles = findTranscriptFiles(resolvedPath);

    for (const filePath of sessionFiles) {
      const pathHash = hashPath(filePath);
      const projectTag = path.basename(resolvedPath);
      const agentType = detectAgentType(filePath);

      // Check capture offset
      const offsetRow = db.prepare('SELECT byte_offset FROM capture_offsets WHERE source_path_hash = ?').get(pathHash);
      const startOffset = offsetRow ? offsetRow.byte_offset : 0;

      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }

      if (stat.size <= startOffset) continue; // No new content

      // Read new content incrementally
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(stat.size - startOffset);
      fs.readSync(fd, buffer, 0, buffer.length, startOffset);
      fs.closeSync(fd);

      const newContent = buffer.toString('utf-8');
      const lines = newContent.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length === 0) continue;

      const sessionId = `s_${pathHash.substring(0, 8)}`;
      const now = new Date().toISOString();

      // Ensure session record exists
      const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
      if (!existingSession) {
        db.prepare(`
          INSERT INTO sessions (id, agent, source_path_hash, project_tag, state, started_at, last_event_at, adapter_version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(sessionId, agentType, pathHash, projectTag, 'CAPTURING', now, now, ADAPTER_VERSION);
      }

      // Get current max seq
      const seqRow = db.prepare('SELECT MAX(seq) as max_seq FROM events WHERE session_id = ?').get(sessionId);
      let currentSeq = (seqRow && seqRow.max_seq) ? seqRow.max_seq : 0;

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO events (id, session_id, seq, ts, kind, text_scrubbed, redaction_counts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((linesToProcess) => {
        for (const line of linesToProcess) {
          currentSeq += 1;
          const evt = normalizeLineToEvent(line, sessionId, currentSeq);
          insertStmt.run(evt.id, evt.session_id, evt.seq, evt.ts, evt.kind, evt.text_scrubbed, evt.redaction_counts);
          totalCaptured += 1;
        }

        // Update byte offset
        db.prepare(`
          INSERT INTO capture_offsets (source_path_hash, byte_offset, inode, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(source_path_hash) DO UPDATE SET
            byte_offset = excluded.byte_offset,
            updated_at = excluded.updated_at
        `).run(pathHash, stat.size, stat.ino || 0, now);

        // Update session state
        db.prepare(`
          UPDATE sessions SET last_event_at = ?, state = 'QUEUED' WHERE id = ?
        `).run(now, sessionId);

        // Queue distillation job — upsert so re-captures don't crash
        db.prepare(`
          INSERT INTO jobs (id, session_id, type, state, attempts, run_after)
          VALUES (?, ?, 'DISTILL', 'QUEUED', 0, ?)
          ON CONFLICT(id) DO UPDATE SET state = 'QUEUED', run_after = excluded.run_after
        `).run(`job_${sessionId}`, sessionId, now);
      });

      transaction(lines);
    }
  }

  return { status: 'ACTIVE', capturedEvents: totalCaptured };
}

function findTranscriptFiles(dirPath) {
  const results = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist, build, .next, etc.
        if (['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage'].includes(entry.name)) continue;
        results.push(...findTranscriptFiles(fullPath));
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (
          lowerName.endsWith('.jsonl') ||
          lowerName.endsWith('.transcript') ||
          lowerName.includes('claude') ||
          lowerName.includes('agent') ||
          lowerName.includes('cursor') ||
          lowerName.includes('windsurf') ||
          lowerName.includes('aider') ||
          fullPath.includes('.agentrelay') ||
          fullPath.includes('.claude')
        ) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // ignore inaccessible directories
  }
  return results;
}
