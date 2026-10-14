import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';
import { createUser, createApiToken } from '../src/db/queries/users.js';
import { createTeam } from '../src/db/queries/teams.js';

describe('Records API Lifecycle & Ingestion (TEST-013, TEST-014, TEST-016, TEST-018)', () => {
  let client;
  let user, token;
  let team;

  before(async () => {
    client = createMockClient(app);
    user = createUser({ id: 'u_rec_test', githubId: 'gh_rec_test', handle: '@developer' });
    token = 'lcp_pat_token_records_test_999';
    createApiToken({ id: 'tok_rec_test', userId: user.id, rawToken: token });
    team = createTeam({ id: 't_rec_team', name: 'Core Team', createdBy: user.id });
  });

  function createValidRecord(overrides = {}) {
    return {
      recordId: '9b1f3c2e-0000-0000-0000-0857ef51a001',
      version: 1,
      schemaVersion: 'lcp.record/0.1',
      author: { userId: user.id, handle: '@developer', deviceId: 'test-device' },
      origin: 'local',
      source: {
        agent: 'claude-code',
        agentVersion: '1.0.0',
        adapterVersion: '0.1.0',
        sessionId: 's_100',
        eventRange: [1, 50],
        projectTag: 'auth-service'
      },
      times: {
        sessionStart: '2026-10-06T09:00:00Z',
        sessionEnd: '2026-10-06T09:30:00Z',
        createdAt: '2026-10-06T09:35:00Z',
        updatedAt: '2026-10-06T09:35:00Z'
      },
      content: {
        title: 'Implement token hashing',
        summary: 'Decided to use HMAC-SHA256 with pepper.',
        decisions: [
          { text: 'Use HMAC SHA-256 for token storage', evidence: ['e_12', 'e_15'] }
        ],
        filesTouched: ['src/db/queries/users.js'],
        openQuestions: [],
        tags: ['auth', 'crypto']
      },
      sensitivity: {
        label: 'none',
        scrubberVersion: '0.1.0',
        redactionCounts: {}
      },
      visibility: {
        shareable: true,
        teamId: null,
        promotedAt: null
      },
      acl: {
        projectTag: 'auth-service',
        teamId: team.id
      },
      feedback: {
        status: 'accepted',
        reviewedAt: '2026-10-06T09:36:00Z'
      },
      provenance: {
        distiller: { runtime: 'local', model: 'test-distiller' },
        supersedes: null
      },
      ...overrides
    };
  }

  it('Refuses to promote non-shareable record (TEST-013)', async () => {
    const record = createValidRecord({
      visibility: { shareable: false, teamId: null, promotedAt: null }
    });

    const res = await client('PUT', `/api/v1/teams/${team.id}/records/${record.recordId}/versions/1`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: record
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'FORBIDDEN');
  });

  it('Server re-scrubs planted secrets on promotion (TEST-016)', async () => {
    const record = createValidRecord({
      recordId: '9b1f3c2e-0000-0000-0000-0857ef51a002',
      content: {
        title: 'Secret test',
        summary: 'Pasted AWS key AKIAIOSFODNN7EXAMPLE and token ghp_111122223333444455556666777788889999 into notes',
        decisions: [
          { text: 'Keep token secure', evidence: ['e_1'] }
        ],
        filesTouched: []
      }
    });

    const res = await client('PUT', `/api/v1/teams/${team.id}/records/${record.recordId}/versions/1`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: record
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.match(body.record.content.summary, /\[REDACTED:aws_key\]/);
    assert.match(body.record.content.summary, /\[REDACTED:github_token\]/);
    assert.strictEqual(body.record.sensitivity.redactionCounts.aws_key, 1);
    assert.strictEqual(body.record.sensitivity.redactionCounts.github_token, 1);
  });

  it('Promotion is idempotent on (team_id, record_id, version) (TEST-014)', async () => {
    const record = createValidRecord({
      recordId: '9b1f3c2e-0000-0000-0000-0857ef51a003'
    });

    const res1 = await client('PUT', `/api/v1/teams/${team.id}/records/${record.recordId}/versions/1`, {
      headers: { Authorization: `Bearer ${token}` },
      body: record
    });
    assert.strictEqual(res1.status, 200);
    const body1 = await res1.json();

    // Second promote with same version updates in place
    const res2 = await client('PUT', `/api/v1/teams/${team.id}/records/${record.recordId}/versions/1`, {
      headers: { Authorization: `Bearer ${token}` },
      body: record
    });
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body1.seq, body2.seq);
  });

  it('Incremental pull using sequence cursor (TEST-018)', async () => {
    const res = await client('GET', `/api/v1/teams/${team.id}/records?since=0&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(Array.isArray(body.records), true);
    assert.strictEqual(body.records.length >= 2, true);
    assert.strictEqual(typeof body.cursor, 'number');
  });

  it('Withdrawal creates a tombstone and filters out record from single read', async () => {
    const recordId = '9b1f3c2e-0000-0000-0000-0857ef51a003';
    const delRes = await client('DELETE', `/api/v1/teams/${team.id}/records/${recordId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(delRes.status, 200);

    const getRes = await client('GET', `/api/v1/teams/${team.id}/records/${recordId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(getRes.status, 404);
  });

  it('Withdrawal propagates tombstone in incremental pull (PRD FR-022, BR-011)', async () => {
    // 1. Promote a fresh record
    const testRecordId = '9b1f3c2e-0000-0000-0000-0857ef51a099';
    const record = createValidRecord({
      recordId: testRecordId
    });

    const promoteRes = await client('PUT', `/api/v1/teams/${team.id}/records/${testRecordId}/versions/1`, {
      headers: { Authorization: `Bearer ${token}` },
      body: record
    });
    assert.strictEqual(promoteRes.status, 200);
    const promoteBody = await promoteRes.json();
    const promotedSeq = promoteBody.seq;

    // 2. Incremental pull before withdrawal captures it at promotedSeq
    const pull1 = await client('GET', `/api/v1/teams/${team.id}/records?since=${promotedSeq - 1}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pull1Body = await pull1.json();
    const found1 = pull1Body.records.find(r => r.recordId === testRecordId);
    assert.ok(found1);
    assert.strictEqual(found1.isWithdrawn, false);

    // 3. Withdraw the record
    const delRes = await client('DELETE', `/api/v1/teams/${team.id}/records/${testRecordId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(delRes.status, 200);

    // 4. Subsequent incremental pull with cursor = promotedSeq yields the tombstone
    const pull2 = await client('GET', `/api/v1/teams/${team.id}/records?since=${promotedSeq}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pull2Body = await pull2.json();
    const found2 = pull2Body.records.find(r => r.recordId === testRecordId);
    assert.ok(found2, 'Withdrawn record should be returned in incremental pull after promotedSeq');
    assert.strictEqual(found2.isWithdrawn, true);
    assert.strictEqual(found2.withdrawn, true);
    assert.ok(found2.withdrawnAt);
    assert.ok(found2.seq > promotedSeq, 'Tombstone sequence must advance cursor');
  });

  it('Non-author non-admin member cannot withdraw record (403 Forbidden)', async () => {
    // Promote record as developer
    const testRecordId = '9b1f3c2e-0000-0000-0000-0857ef51a088';
    const record = createValidRecord({ recordId: testRecordId });
    await client('PUT', `/api/v1/teams/${team.id}/records/${testRecordId}/versions/1`, {
      headers: { Authorization: `Bearer ${token}` },
      body: record
    });

    // Create another user who is only a member (not admin, not author)
    const otherUser = createUser({ id: `u_other_${Date.now()}`, githubId: `gh_other_${Date.now()}`, handle: '@other_member' });
    const otherToken = `lcp_other_tok_${Date.now()}`;
    createApiToken({ id: `tok_other_${Date.now()}`, userId: otherUser.id, rawToken: otherToken });
    const { addMember } = await import('../src/db/queries/teams.js');
    addMember({ teamId: team.id, userId: otherUser.id, role: 'member' });

    // Try to delete as otherUser
    const delRes = await client('DELETE', `/api/v1/teams/${team.id}/records/${testRecordId}`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    assert.strictEqual(delRes.status, 403);
  });
});
