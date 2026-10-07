import assert from 'node:assert';
import test from 'node:test';
import { scrubText } from '../src/core/scrubber.js';
import { validateContextRecord, CURRENT_SCHEMA_VERSION } from '../src/core/schema.js';
import { normalizeLineToEvent, detectAgentType } from '../src/watcher/adapter.js';
import { loadConfig, getDefaultConfig } from '../src/config.js';

test('Scrubber - Redacts planted secrets and reports counts', () => {
  const secretText = `
    Access Key: AKIAIOSFODNN7EXAMPLE
    Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz
    Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test
    Contact: dev@agentrelay.dev
  `;

  const { text, redactionCounts } = scrubText(secretText);

  assert.ok(!text.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS key should be redacted');
  assert.ok(!text.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'), 'GitHub token should be redacted');
  assert.ok(text.includes('[REDACTED:aws_key]'), 'Placeholder should indicate aws_key');
  assert.ok(text.includes('[REDACTED:github_token]'), 'Placeholder should indicate github_token');
  assert.strictEqual(redactionCounts.aws_key, 1);
  assert.strictEqual(redactionCounts.github_token, 1);
});

test('Adapter - Normalizes transcript line to event schema', () => {
  const rawLine = JSON.stringify({
    type: 'user',
    content: 'Fix auth bug with ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    timestamp: '2026-10-07T10:00:00Z',
  });

  const evt = normalizeLineToEvent(rawLine, 's_1', 1);

  assert.strictEqual(evt.id, 'e_1');
  assert.strictEqual(evt.session_id, 's_1');
  assert.strictEqual(evt.kind, 'user');
  assert.ok(!evt.text_scrubbed.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'));
  assert.ok(evt.text_scrubbed.includes('[REDACTED:github_token]'));
});

test('Adapter - Handles content block arrays and detects agent types', () => {
  assert.strictEqual(detectAgentType('/path/to/.claude/session.jsonl'), 'claude-code');
  assert.strictEqual(detectAgentType('/path/to/.cursor/logs.txt'), 'cursor');
  assert.strictEqual(detectAgentType('/path/to/project/aider.chat.history.md'), 'aider');

  const arrayContentLine = JSON.stringify({
    role: 'assistant',
    content: [
      { type: 'text', text: 'Refactored auth module with key AKIAIOSFODNN7EXAMPLE' },
      { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
    ],
  });

  const evt = normalizeLineToEvent(arrayContentLine, 's_2', 1);
  assert.strictEqual(evt.kind, 'assistant');
  assert.ok(evt.text_scrubbed.includes('[REDACTED:aws_key]'));
  assert.ok(evt.text_scrubbed.includes('[Tool: Bash'));
});

test('Schema - Validates compliant context record', () => {
  const validRecord = {
    recordId: 'record-101',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    author: { userId: 'u_1', handle: '@daksh' },
    origin: 'local',
    source: {
      agent: 'claude-code',
      agentVersion: '0.1.0',
      adapterVersion: '0.1.0',
      sessionId: 's_1',
      eventRange: [1, 5],
      projectTag: 'test-app',
    },
    times: {
      sessionStart: new Date().toISOString(),
      sessionEnd: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    content: {
      title: 'Fix JWT Validation',
      summary: 'Wrapped JWT verify call in try catch block.',
      decisions: [{ text: 'Return 401 on expired token', evidence: ['e_1'] }],
      filesTouched: ['src/auth.ts'],
      openQuestions: [],
      tags: ['auth'],
    },
    sensitivity: { label: 'none', scrubberVersion: '0.1.0', redactionCounts: {} },
    visibility: { shareable: false, teamId: null, promotedAt: null },
    acl: { projectTag: 'test-app', teamId: null },
    feedback: { status: 'unreviewed', reviewedAt: null },
    provenance: {
      distiller: { runtime: 'local', model: 'qwen2.5-coder:7b', promptVersion: 'd-0.2' },
      supersedes: null,
    },
  };

  assert.strictEqual(validateContextRecord(validRecord), true);
});

test('Config - Default config structure and scope save', () => {
  const cfg = getDefaultConfig();
  assert.ok(Array.isArray(cfg.scopes));
  assert.strictEqual(cfg.paused, false);
});
