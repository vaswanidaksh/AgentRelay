import assert from 'node:assert';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.AGENTRELAY_HOME = path.join(os.tmpdir(), `agentrelay_unit_test_${Date.now()}`);

import { scrubText } from '../src/core/scrubber.js';
import { validateContextRecord, CURRENT_SCHEMA_VERSION } from '../src/core/schema.js';
import { normalizeLineToEvent, detectAgentType } from '../src/watcher/adapter.js';
import { loadConfig, getDefaultConfig } from '../src/config.js';
import { evaluateSecondPassSensitivity } from '../src/distiller/distiller.js';
import { formatRecordToMarkdown, syncGlobalContextFiles } from '../src/core/contextExporter.js';
import { handleMcpRequest } from '../src/mcp/server.js';
import { saveRecord } from '../src/db.js';

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

test('Distiller - Second-pass sensitivity check flags prose credentials & internal hosts (FR-011)', async () => {
  const cleanEvents = [
    { id: 'e_1', kind: 'user', text_scrubbed: 'Refactor helper functions' },
    { id: 'e_2', kind: 'assistant', text_scrubbed: 'Done, all tests passing.' },
  ];
  const cleanResult = await evaluateSecondPassSensitivity(cleanEvents, {}, 'none');
  assert.strictEqual(cleanResult, 'none');

  const proseCredentialEvents = [
    { id: 'e_1', kind: 'user', text_scrubbed: 'Database password is SuperSecretPassword123' },
  ];
  const credResult = await evaluateSecondPassSensitivity(proseCredentialEvents, {}, 'none');
  assert.strictEqual(credResult, 'review', 'Should raise sensitivity to review for prose credentials');

  const internalHostEvents = [
    { id: 'e_1', kind: 'assistant', text_scrubbed: 'Deploying to staging-api.corp.internal' },
  ];
  const hostResult = await evaluateSecondPassSensitivity(internalHostEvents, {}, 'none');
  assert.strictEqual(hostResult, 'review', 'Should raise sensitivity to review for internal hostnames');

  // Acceptance criteria: Can raise sensitivity, can NEVER lower it
  const neverLowerResult = await evaluateSecondPassSensitivity(cleanEvents, {}, 'review');
  assert.strictEqual(neverLowerResult, 'review', 'Must never lower sensitivity from review to none');
});

test('Context Exporter - Formats Markdown context pack with evidence', () => {
  const mockRecord = {
    recordId: 'rec-test-1',
    version: 1,
    author: { handle: '@alice', userId: 'u_1' },
    acl: { projectTag: 'auth-service' },
    source: { agent: 'claude-code' },
    times: { createdAt: '2026-10-10T12:00:00Z' },
    origin: 'team',
    content: {
      title: 'Fix JWT Validation',
      summary: 'Added token expiration handling.',
      decisions: [{ text: 'Reject expired tokens with 401', evidence: ['e_1'] }],
      filesTouched: ['auth/jwt.js'],
      openQuestions: [],
    },
  };
  const mockEvents = [
    { id: 'e_1', kind: 'user', ts: '2026-10-10T12:00:00Z', text_scrubbed: 'Fix token bug' },
  ];

  const md = formatRecordToMarkdown(mockRecord, mockEvents);
  assert.ok(md.includes('# Context Pack: Fix JWT Validation'));
  assert.ok(md.includes('auth/jwt.js'));
  assert.ok(md.includes('Reject expired tokens with 401'));
  assert.ok(md.includes('e_1'));
});

test('MCP Server - Dispatches JSON-RPC requests correctly (FR-027)', async () => {
  // Test initialize
  const initRes = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' },
  });
  assert.strictEqual(initRes.id, 1);
  assert.strictEqual(initRes.result.serverInfo.name, 'agentrelay-mcp');
  assert.ok(initRes.result.capabilities.tools);

  // Test tools/list
  const toolsRes = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });
  assert.strictEqual(toolsRes.id, 2);
  const toolNames = toolsRes.result.tools.map(t => t.name);
  assert.ok(toolNames.includes('search_context'), 'Exposes search_context tool');
  assert.ok(toolNames.includes('show_record'), 'Exposes show_record tool');
  assert.strictEqual(toolsRes.result.tools.length, 2, 'Exposes search/show only per FR-027');

  // Test search_context
  const searchRes = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'search_context', arguments: { query: 'nonexistent-xyz-query' } },
  });
  assert.strictEqual(searchRes.id, 3);
  assert.ok(searchRes.result.content[0].text.includes('No past context records found'));

  // Test unknown tool
  const unknownRes = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'modify_code', arguments: {} },
  });
  assert.strictEqual(unknownRes.error.code, -32601);

  // Save a record to DB and test show_record tool
  const recordToSave = {
    recordId: 'rec-mcp-999',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    author: { userId: 'u_1', handle: '@bob' },
    origin: 'local',
    source: { agent: 'claude-code', sessionId: 's_mcp_1', projectTag: 'api-service' },
    times: { createdAt: new Date().toISOString() },
    content: {
      title: 'Database connection retry policy',
      summary: 'Added exponential backoff to Postgres pool.',
      decisions: [{ text: 'Exponential backoff with jitter', evidence: ['e_1'] }],
      filesTouched: ['src/db/pool.ts'],
      openQuestions: [],
      tags: ['database'],
    },
    sensitivity: { label: 'none', scrubberVersion: '0.1.0', redactionCounts: {} },
    visibility: { shareable: true },
    acl: { projectTag: 'api-service' },
    feedback: { status: 'accepted' },
    provenance: { distiller: { runtime: 'local', model: 'qwen' } },
  };
  saveRecord(recordToSave);

  const showRes = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'show_record', arguments: { recordId: 'rec-mcp-999' } },
  });
  assert.strictEqual(showRes.id, 5);
  assert.ok(showRes.result.content[0].text.includes('Database connection retry policy'));
  assert.ok(showRes.result.content[0].text.includes('Exponential backoff with jitter'));
});

test('Context Exporter - syncGlobalContextFiles writes context packs and CONTEXT.md', () => {
  const exportDir = path.join(os.tmpdir(), `agentrelay_context_test_${Date.now()}`);
  const result = syncGlobalContextFiles(exportDir, { writeCwd: false });

  assert.ok(result.count >= 1, 'Should export at least the saved record');
  assert.strictEqual(result.dir, exportDir);
  assert.ok(fs.existsSync(result.indexFile), 'CONTEXT.md must exist');

  const contextMdContent = fs.readFileSync(result.indexFile, 'utf-8');
  assert.ok(contextMdContent.includes('# AgentRelay — Global Team Context & Decision Memory'));
  assert.ok(contextMdContent.includes('Global Code Files Referenced Across Sessions'));
  assert.ok(contextMdContent.includes('src/db/pool.ts'));
  assert.ok(contextMdContent.includes('Database connection retry policy'));
});


