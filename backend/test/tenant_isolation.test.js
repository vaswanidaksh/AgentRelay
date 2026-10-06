import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';
import { createUser, createApiToken } from '../src/db/queries/users.js';
import { createTeam } from '../src/db/queries/teams.js';

describe('Tenant Isolation Suite (TEST-015, BR-007)', () => {
  let client;
  let userA, tokenA;
  let userB, tokenB;
  let teamAlpha, teamBeta;

  before(async () => {
    client = createMockClient(app);

    userA = createUser({ id: 'u_iso_a', githubId: 'gh_iso_a', handle: '@alice' });
    userB = createUser({ id: 'u_iso_b', githubId: 'gh_iso_b', handle: '@bob' });

    tokenA = 'lcp_pat_token_alice_iso_123';
    tokenB = 'lcp_pat_token_bob_iso_456';

    createApiToken({ id: 'tok_iso_a', userId: userA.id, rawToken: tokenA });
    createApiToken({ id: 'tok_iso_b', userId: userB.id, rawToken: tokenB });

    teamAlpha = createTeam({ id: 't_alpha', name: 'Alpha Squad', createdBy: userA.id });
    teamBeta = createTeam({ id: 't_beta', name: 'Beta Squad', createdBy: userB.id });
  });

  it('Alice can access her own Team Alpha members', async () => {
    const res = await client('GET', `/api/v1/teams/${teamAlpha.id}/members`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.members.length, 1);
    assert.strictEqual(body.members[0].id, userA.id);
  });

  it('Alice CANNOT read records from Team Beta (returns 404 to avoid leaking team existence)', async () => {
    const res = await client('GET', `/api/v1/teams/${teamBeta.id}/records`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'NOT_FOUND');
  });

  it('Alice CANNOT promote a record into Team Beta', async () => {
    const fakeRecord = {
      recordId: '11111111-1111-1111-1111-111111111111',
      version: 1,
      schemaVersion: 'lcp.record/0.1',
      author: { userId: userA.id, handle: '@alice', deviceId: 'd1' },
      origin: 'local',
      source: { agent: 'claude-code', agentVersion: '1.0', adapterVersion: '0.1', sessionId: 's1', eventRange: [1, 5], projectTag: 'p' },
      times: { sessionStart: new Date().toISOString(), sessionEnd: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      content: {
        title: 'Unauthorized promotion attempt',
        summary: 'Testing isolation',
        decisions: [{ text: 'decision 1', evidence: ['e_1'] }],
        filesTouched: []
      },
      sensitivity: { label: 'none', scrubberVersion: '0.1.0', redactionCounts: {} },
      visibility: { shareable: true },
      acl: { projectTag: 'p', teamId: teamBeta.id },
      feedback: { status: 'accepted', reviewedAt: new Date().toISOString() },
      provenance: { distiller: { runtime: 'local', model: 'test' }, supersedes: null }
    };

    const res = await client('PUT', `/api/v1/teams/${teamBeta.id}/records/${fakeRecord.recordId}/versions/1`, {
      headers: {
        Authorization: `Bearer ${tokenA}`
      },
      body: fakeRecord
    });

    assert.strictEqual(res.status, 404);
  });

  it('Alice CANNOT create invites for Team Beta', async () => {
    const res = await client('POST', `/api/v1/teams/${teamBeta.id}/invites`, {
      headers: {
        Authorization: `Bearer ${tokenA}`
      },
      body: { maxUses: 5 }
    });
    assert.strictEqual(res.status, 404);
  });
});
