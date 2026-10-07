#!/usr/bin/env node

/**
 * AgentRelay CLI — End-to-End Smoke Test
 *
 * This script exercises the full local pipeline:
 *   1. Init → creates ~/.agentrelay dir + db
 *   2. Scope → adds a test folder with fake agent transcript files
 *   3. Capture → watcher reads new content, scrubs secrets, saves events
 *   4. Distill → distiller processes events into context records
 *   5. Search → FTS5 / fallback search over local records
 *   6. Review → accept candidate records
 *   7. Share  → mark record as shareable
 *   8. Export → produce Markdown context pack
 *   9. Status → verify dashboard counters
 *  10. Purge  → clean up
 *
 * Run from the project root:
 *   node cli/test/e2e-smoke.js
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_BIN = path.resolve(__dirname, '..', 'bin', 'agentrelay.js');
const TEST_DIR = path.join(os.tmpdir(), `agentrelay_e2e_test_${Date.now()}`);

// ─── Helpers ───────────────────────────────────────────────────

import { execSync } from 'child_process';

function run(args, opts = {}) {
  const cmd = `node "${CLI_BIN}" ${args}`;
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, AGENTRELAY_HOME: path.join(TEST_DIR, '.agentrelay') },
      ...opts,
    });
    return output.trim();
  } catch (err) {
    return (err.stdout || '') + (err.stderr || '');
  }
}

function heading(msg) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${'═'.repeat(60)}`);
}

function pass(label) { console.log(`  ✔ ${label}`); }
function fail(label, detail) { console.log(`  ✖ ${label}: ${detail}`); process.exitCode = 1; }
function check(label, condition, detail = '') {
  condition ? pass(label) : fail(label, detail || 'assertion failed');
}

// ─── Setup ─────────────────────────────────────────────────────

heading('SETUP — Creating test fixtures');

// Create test project with fake agent transcript files
const projectDir = path.join(TEST_DIR, 'my-test-project');
const transcriptDir = path.join(projectDir, '.claude');
fs.mkdirSync(transcriptDir, { recursive: true });

// Write a JSONL transcript file simulating a Claude Code session
const transcriptFile = path.join(transcriptDir, 'agent-session.jsonl');
const transcriptLines = [
  JSON.stringify({ type: 'user', content: 'Fix the JWT validation bug in auth/middleware.ts. My GitHub token is ghp_ABCDEFghijklmnop1234567890abcdefghi', timestamp: '2026-10-07T10:00:00Z' }),
  JSON.stringify({ type: 'assistant', content: 'I\'ll wrap the JWT verify in a try/catch and handle TokenExpiredError to return a 401. The AWS key AKIAIOSFODNN7EXAMPLE in your .env should also be rotated.', timestamp: '2026-10-07T10:00:05Z' }),
  JSON.stringify({ type: 'tool_use', name: 'write_file', input: { path: 'auth/middleware.ts', content: 'export function authMiddleware() { /* fixed */ }' }, timestamp: '2026-10-07T10:00:10Z' }),
  JSON.stringify({ type: 'tool_result', output: 'File auth/middleware.ts written successfully', timestamp: '2026-10-07T10:00:11Z' }),
  JSON.stringify({ type: 'assistant', content: 'Done! I\'ve added a try/catch block around jwt.verify(). Tests pass for expired tokens. Contact dev@company.com for deployment review.', timestamp: '2026-10-07T10:00:15Z' }),
].join('\n') + '\n';

fs.writeFileSync(transcriptFile, transcriptLines, 'utf-8');
pass(`Created test project at ${projectDir}`);
pass(`Created fake agent transcript with 5 events at ${transcriptFile}`);

// ─── Test 1: Init ──────────────────────────────────────────────

heading('TEST 1 — agentrelay init');
const initOutput = run('init');
check('Init creates local store', initOutput.includes('AgentRelay directory'));
check('Init reports SQLite initialized', initOutput.includes('SQLite store initialized'));
console.log(`\n  Output:\n${initOutput.split('\n').map(l => `    ${l}`).join('\n')}`);

// ─── Test 2: Scope ─────────────────────────────────────────────

heading('TEST 2 — agentrelay scope');

const scopeListEmpty = run('scope list');
check('Scope list empty initially', scopeListEmpty.includes('No folders'));

const scopeAdd = run(`scope add "${projectDir}"`);
check('Scope add succeeds', scopeAdd.includes('Added to capture scope'));

const scopeListFull = run('scope list');
check('Scope list shows added folder', scopeListFull.includes('my-test-project'));

// ─── Test 3: Status (before capture) ───────────────────────────

heading('TEST 3 — agentrelay status (pre-capture)');
const statusPre = run('status');
check('Status shows ACTIVE', statusPre.includes('ACTIVE'));
check('Status shows 1 folder', statusPre.includes('1 folder'));
check('Status shows 0 sessions initially', statusPre.includes('0 sessions'));
console.log(`\n  Output:\n${statusPre.split('\n').map(l => `    ${l}`).join('\n')}`);

// ─── Test 4: Capture (via daemon single-pass) ──────────────────

heading('TEST 4 — Watcher capture (programmatic)');

// Instead of running daemon, we import and call scanAndCaptureSessionFiles directly
const captureScript = `
import { scanAndCaptureSessionFiles } from '${path.resolve(__dirname, '..', 'src', 'watcher', 'watcher.js').replace(/\\/g, '/')}';
const result = scanAndCaptureSessionFiles();
console.log(JSON.stringify(result));
`;
const captureScriptPath = path.join(TEST_DIR, '_capture.mjs');
fs.writeFileSync(captureScriptPath, captureScript, 'utf-8');

const captureOutput = execSync(`node "${captureScriptPath}"`, {
  encoding: 'utf-8',
  env: { ...process.env, AGENTRELAY_HOME: path.join(TEST_DIR, '.agentrelay') },
}).trim();

let captureResult;
try {
  captureResult = JSON.parse(captureOutput);
} catch {
  captureResult = { status: 'ERROR', capturedEvents: 0 };
}

check('Capture status is ACTIVE', captureResult.status === 'ACTIVE');
check('Captured 5 events from transcript', captureResult.capturedEvents === 5, `got ${captureResult.capturedEvents}`);
console.log(`\n  Capture result: ${JSON.stringify(captureResult)}`);

// ─── Test 5: Status (after capture) ────────────────────────────

heading('TEST 5 — agentrelay status (post-capture)');
const statusPost = run('status');
check('Status now shows 1 session', statusPost.includes('1 sessions'));
check('Status now shows 5 events', statusPost.includes('5 events'));
check('Status shows 1 pending job', statusPost.includes('1 pending'));
console.log(`\n  Output:\n${statusPost.split('\n').map(l => `    ${l}`).join('\n')}`);

// ─── Test 6: Distillation ──────────────────────────────────────

heading('TEST 6 — Distillation (programmatic)');
const distillScript = `
import { processDistillJobs } from '${path.resolve(__dirname, '..', 'src', 'distiller', 'distiller.js').replace(/\\/g, '/')}';
const count = await processDistillJobs();
console.log(count);
`;
const distillScriptPath = path.join(TEST_DIR, '_distill.mjs');
fs.writeFileSync(distillScriptPath, distillScript, 'utf-8');

const distillOutput = execSync(`node "${distillScriptPath}"`, {
  encoding: 'utf-8',
  timeout: 10000,
  env: { ...process.env, AGENTRELAY_HOME: path.join(TEST_DIR, '.agentrelay') },
}).trim();

check('Distilled 1 record', distillOutput === '1', `got "${distillOutput}"`);

// ─── Test 7: Search ────────────────────────────────────────────

heading('TEST 7 — agentrelay search');
const searchOutput = run('search --json');
let searchRecords = [];
try { searchRecords = JSON.parse(searchOutput); } catch { /* ignore */ }
check('Search returns at least 1 record', searchRecords.length >= 1, `got ${searchRecords.length}`);

if (searchRecords.length > 0) {
  const rec = searchRecords[0];
  check('Record has recordId', !!rec.recordId);
  check('Record has schemaVersion', rec.schemaVersion === 'agentrelay.record/0.1');
  check('Record content has title', !!rec.content?.title);
  check('Record content has decisions', rec.content?.decisions?.length >= 1);

  // Check that secrets were scrubbed in the record
  const fullJson = JSON.stringify(rec);
  check('No raw GitHub token in record', !fullJson.includes('ghp_ABCDEFghijklmnop'));
  check('No raw AWS key in record', !fullJson.includes('AKIAIOSFODNN7EXAMPLE'));
  check('No raw email in record', !fullJson.includes('dev@company.com'));

  // ─── Test 8: Show ──────────────────────────────────────────
  heading('TEST 8 — agentrelay show');
  const showOutput = run(`show ${rec.recordId}`);
  check('Show displays record ID', showOutput.includes(rec.recordId));
  check('Show displays title', showOutput.includes(rec.content.title.substring(0, 30)));

  // ─── Test 9: Review ────────────────────────────────────────
  heading('TEST 9 — agentrelay review --accept');
  const reviewOutput = run('review --accept');
  check('Review accepted record', reviewOutput.includes('Accepted'));

  // ─── Test 10: Share ────────────────────────────────────────
  heading('TEST 10 — agentrelay share');
  const shareOutput = run(`share ${rec.recordId}`);
  check('Share succeeds', shareOutput.includes('TRUE'));

  // Verify shareable flag via show --json
  const showJsonOutput = run(`show ${rec.recordId} --json`);
  let updatedRec;
  try { updatedRec = JSON.parse(showJsonOutput); } catch { /* ignore */ }
  check('Record is now shareable', updatedRec?.visibility?.shareable === true);
  check('Record feedback is accepted', updatedRec?.feedback?.status === 'accepted');

  // ─── Test 11: Export ───────────────────────────────────────
  heading('TEST 11 — agentrelay export');
  const exportOutput = run(`export ${rec.recordId}`, { cwd: TEST_DIR });
  check('Export produces markdown file', exportOutput.includes('Exported Markdown'));

  // ─── Test 12: Unshare ──────────────────────────────────────
  heading('TEST 12 — agentrelay unshare');
  const unshareOutput = run(`unshare ${rec.recordId}`);
  check('Unshare succeeds', unshareOutput.includes('FALSE'));
}

// ─── Test 13: Pause / Resume ─────────────────────────────────

heading('TEST 13 — agentrelay pause / resume');
const pauseOutput = run('pause');
check('Pause succeeds', pauseOutput.includes('PAUSED'));

const statusPaused = run('status');
check('Status shows PAUSED', statusPaused.includes('PAUSED'));

const resumeOutput = run('resume');
check('Resume succeeds', resumeOutput.includes('RESUMED'));

// ─── Test 14: Incremental Capture ────────────────────────────

heading('TEST 14 — Incremental capture (append to transcript)');

// Append new lines to the transcript file
const newLines = [
  JSON.stringify({ type: 'user', content: 'Now add unit tests for the auth middleware', timestamp: '2026-10-07T10:01:00Z' }),
  JSON.stringify({ type: 'assistant', content: 'I\'ll create tests/auth.test.ts with Jest + Supertest covering valid, expired, and missing token scenarios.', timestamp: '2026-10-07T10:01:05Z' }),
].join('\n') + '\n';

fs.appendFileSync(transcriptFile, newLines, 'utf-8');

const captureScript2 = `
import { scanAndCaptureSessionFiles } from '${path.resolve(__dirname, '..', 'src', 'watcher', 'watcher.js').replace(/\\/g, '/')}';
const result = scanAndCaptureSessionFiles();
console.log(JSON.stringify(result));
`;
const capture2Path = path.join(TEST_DIR, '_capture2.mjs');
fs.writeFileSync(capture2Path, captureScript2, 'utf-8');

const capture2Output = execSync(`node "${capture2Path}"`, {
  encoding: 'utf-8',
  env: { ...process.env, AGENTRELAY_HOME: path.join(TEST_DIR, '.agentrelay') },
}).trim();

let capture2Result;
try { capture2Result = JSON.parse(capture2Output); } catch { capture2Result = { capturedEvents: 0 }; }
check('Incremental capture picks up only 2 new events', capture2Result.capturedEvents === 2, `got ${capture2Result.capturedEvents}`);

// ─── Test 15: Purge ──────────────────────────────────────────

heading('TEST 15 — agentrelay purge');
const purgeOutput = run('purge --all');
check('Purge completes', purgeOutput.includes('Purged all'));

const statusPurged = run('status');
check('Status shows 0 sessions after purge', statusPurged.includes('0 sessions'));

// ─── Cleanup ─────────────────────────────────────────────────

heading('CLEANUP');
fs.rmSync(TEST_DIR, { recursive: true, force: true });
pass(`Removed test directory ${TEST_DIR}`);

// ─── Summary ─────────────────────────────────────────────────

heading('TEST SUMMARY');
if (process.exitCode) {
  console.log('  ⚠ Some tests FAILED. See output above.\n');
} else {
  console.log('  🎉 All tests PASSED! The CLI pipeline is working end-to-end.\n');
}
