import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { loadConfig } from '../config.js';
import { validateContextRecord, CURRENT_SCHEMA_VERSION } from '../core/schema.js';
import { SCRUBBER_VERSION } from '../core/scrubber.js';

export async function processDistillJobs() {
  const db = getDb();
  const config = loadConfig();

  // Find queued distill jobs
  const jobs = db.prepare(`
    SELECT * FROM jobs
    WHERE type = 'DISTILL' AND state = 'QUEUED' AND run_after <= ?
    ORDER BY run_after ASC LIMIT 5
  `).all(new Date().toISOString());

  let processedCount = 0;

  for (const job of jobs) {
    db.prepare("UPDATE jobs SET state = 'DISTILLING', attempts = attempts + 1 WHERE id = ?").run(job.id);

    try {
      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(job.session_id);
      if (!session) {
        db.prepare("UPDATE jobs SET state = 'FAILED', last_error_code = 'SESSION_NOT_FOUND' WHERE id = ?").run(job.id);
        continue;
      }

      const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC').all(job.session_id);
      if (events.length === 0) {
        db.prepare("UPDATE jobs SET state = 'FAILED', last_error_code = 'NO_EVENTS' WHERE id = ?").run(job.id);
        continue;
      }

      // Distill session into structured record
      const record = await distillSessionEvents(session, events, config);

      // Validate record
      validateContextRecord(record);

      // Save record to DB
      const insertRecordStmt = db.prepare(`
        INSERT INTO records (
          record_id, version, schema_version, json, origin, author_id, project_tag,
          shareable, feedback_status, sensitivity, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(record_id, version) DO UPDATE SET
          json = excluded.json,
          feedback_status = excluded.feedback_status
      `);

      insertRecordStmt.run(
        record.recordId,
        record.version,
        record.schemaVersion,
        JSON.stringify(record),
        record.origin,
        record.author.userId,
        record.acl.projectTag,
        record.visibility.shareable ? 1 : 0,
        record.feedback.status,
        record.sensitivity.label,
        record.times.createdAt
      );

      // Index in FTS5 table if available
      try {
        db.prepare(`
          INSERT INTO records_fts (record_id, title, summary, decisions, tags, project_tag)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          record.recordId,
          record.content.title,
          record.content.summary,
          JSON.stringify(record.content.decisions),
          (record.content.tags || []).join(' '),
          record.acl.projectTag
        );
      } catch {
        // FTS fallback
      }

      // Mark job completed and session READY_FOR_REVIEW
      db.prepare("UPDATE jobs SET state = 'COMPLETED' WHERE id = ?").run(job.id);
      db.prepare("UPDATE sessions SET state = 'READY_FOR_REVIEW' WHERE id = ?").run(session.id);

      processedCount += 1;
    } catch (err) {
      console.error(`Distillation failed for job ${job.id}:`, err.message);
      db.prepare("UPDATE jobs SET state = 'DISTILL_FAILED', last_error_code = ? WHERE id = ?")
        .run(err.code || 'DISTILL_FAILED', job.id);
      db.prepare("UPDATE sessions SET state = 'DISTILL_FAILED' WHERE id = ?").run(job.session_id);
    }
  }

  return processedCount;
}

async function distillSessionEvents(session, events, config) {
  let llmOutput = null;

  // Try calling local model endpoint if available
  try {
    const response = await fetch(`${config.modelRuntimeUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modelName,
        prompt: buildDistillationPrompt(session, events),
        stream: false,
        format: 'json',
      }),
      signal: AbortSignal.timeout(4000), // 4s timeout
    });

    if (response.ok) {
      const resData = await response.json();
      llmOutput = JSON.parse(resData.response);
    }
  } catch {
    // Local LLM server not active; fallback to rule-based edge extraction
  }

  if (!llmOutput) {
    llmOutput = extractRuleBasedDistillation(session, events);
  }

  const now = new Date().toISOString();
  const recordId = uuidv4();

  // Aggregate redaction counts
  const redactionCounts = {};
  for (const evt of events) {
    if (evt.redaction_counts) {
      try {
        const counts = JSON.parse(evt.redaction_counts);
        for (const [k, v] of Object.entries(counts)) {
          redactionCounts[k] = (redactionCounts[k] || 0) + v;
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    recordId,
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    author: {
      userId: process.env.USER || 'local_user',
      handle: `@${process.env.USER || 'developer'}`,
      deviceId: 'local_device',
    },
    origin: 'local',
    source: {
      agent: session.agent,
      agentVersion: '0.1.0',
      adapterVersion: session.adapter_version,
      sessionId: session.id,
      eventRange: [1, events.length],
      projectTag: session.project_tag,
    },
    times: {
      sessionStart: events[0]?.ts || now,
      sessionEnd: events[events.length - 1]?.ts || now,
      createdAt: now,
      updatedAt: now,
    },
    content: {
      title: llmOutput.title || `Session ${session.id} — ${session.project_tag}`,
      summary: llmOutput.summary || `Distilled session containing ${events.length} agent interactions.`,
      decisions: (llmOutput.decisions && llmOutput.decisions.length > 0)
        ? llmOutput.decisions
        : [{ text: `Executed coding task in ${session.project_tag}`, evidence: [events[0]?.id || 'e_1'] }],
      filesTouched: llmOutput.filesTouched || extractFilesTouched(events),
      openQuestions: llmOutput.openQuestions || [],
      tags: llmOutput.tags || ['agent-session', session.project_tag],
    },
    sensitivity: {
      label: Object.keys(redactionCounts).length > 0 ? 'review' : 'none',
      scrubberVersion: SCRUBBER_VERSION,
      redactionCounts,
    },
    visibility: {
      shareable: false,
      teamId: null,
      promotedAt: null,
    },
    acl: {
      projectTag: session.project_tag,
      teamId: null,
    },
    feedback: {
      status: 'unreviewed',
      reviewedAt: null,
    },
    provenance: {
      distiller: {
        runtime: 'local',
        model: config.modelName,
        promptVersion: 'd-0.2',
      },
      supersedes: null,
    },
  };
}

function buildDistillationPrompt(session, events) {
  const eventsText = events.slice(0, 50).map(e => `[${e.id}] (${e.kind}): ${e.text_scrubbed}`).join('\n');
  return `You are a technical context distiller. Distill the following agent session events into JSON.
Return JSON with format:
{
  "title": "string <= 120 chars",
  "summary": "string <= 1200 chars",
  "decisions": [ { "text": "string", "evidence": ["event_id"] } ],
  "filesTouched": ["path/file.ext"],
  "openQuestions": ["string"],
  "tags": ["tag1"]
}

Session Events:
${eventsText}`;
}

function extractRuleBasedDistillation(session, events) {
  const firstUserMsg = events.find(e => e.kind === 'user')?.text_scrubbed || 'AI Coding Session';
  const firstAssistantMsg = events.find(e => e.kind === 'assistant')?.text_scrubbed || '';
  const files = extractFilesTouched(events);
  const evidenceIds = events.slice(0, 3).map(e => e.id);

  const title = firstUserMsg.length > 80 ? `${firstUserMsg.substring(0, 77)}...` : firstUserMsg;
  const summary = firstAssistantMsg
    ? `Task: ${firstUserMsg}\n\nOutcome: ${firstAssistantMsg.substring(0, 500)}`
    : `Executed session task: ${firstUserMsg}`;

  return {
    title,
    summary,
    decisions: [
      {
        text: `Implemented implementation steps for ${session.project_tag}`,
        evidence: evidenceIds,
      }
    ],
    filesTouched: files,
    openQuestions: [],
    tags: [session.project_tag, 'autogenerated'],
  };
}

function extractFilesTouched(events) {
  const files = new Set();
  const fileRegex = /\b([a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)\b/g;

  for (const evt of events) {
    const matches = evt.text_scrubbed.match(fileRegex);
    if (matches) {
      for (const m of matches) {
        if (!m.includes('node_modules') && !m.includes('.git')) {
          files.add(m);
        }
      }
    }
  }

  return Array.from(files);
}
