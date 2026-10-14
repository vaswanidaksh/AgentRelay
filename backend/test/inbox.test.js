import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';
import { createUser, createApiToken } from '../src/db/queries/users.js';
import { createTeam, acceptInvite, createInvite } from '../src/db/queries/teams.js';
import { upsertPromotedRecord } from '../src/db/queries/records.js';

describe('Handoff & Inbox Engine (PRD FR-023, BR-010, §15.2)', () => {
  let client;
  let userAlice, tokenAlice;
  let userBob, tokenBob;
  let userEve, tokenEve; // Outside of team
  let team;
  let recordId;

  before(async () => {
    client = createMockClient(app);

    userAlice = createUser({ id: 'u_alice_hnd', githubId: 'gh_alice_hnd', handle: '@alice_hnd' });
    userBob = createUser({ id: 'u_bob_hnd', githubId: 'gh_bob_hnd', handle: '@bob_hnd' });
    userEve = createUser({ id: 'u_eve_hnd', githubId: 'gh_eve_hnd', handle: '@eve_hnd' });

    tokenAlice = 'lcp_pat_token_alice_hnd_111';
    tokenBob = 'lcp_pat_token_bob_hnd_222';
    tokenEve = 'lcp_pat_token_eve_hnd_333';

    createApiToken({ id: 'tok_alice_hnd', userId: userAlice.id, rawToken: tokenAlice });
    createApiToken({ id: 'tok_bob_hnd', userId: userBob.id, rawToken: tokenBob });
    createApiToken({ id: 'tok_eve_hnd', userId: userEve.id, rawToken: tokenEve });

    // Clean up any inbox entries for test users from previous runs
    const { getDb } = await import('../src/db/connection.js');
    getDb().prepare('DELETE FROM inbox WHERE to_user = ?').run(userBob.id);

    team = createTeam({ id: 't_handoff_team', name: 'Collaboration Team', createdBy: userAlice.id });

    // Invite Bob to team
    const invite = createInvite({
      id: `inv_bob_hnd_${Date.now()}`,
      teamId: team.id,
      rawToken: `inv_token_bob_hnd_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    acceptInvite(invite.id, userBob.id);

    // Create a promoted record in the team
    recordId = '9b1f3c2e-4b6a-48d9-9571-0857ef51a799';
    const sampleRecord = {
      recordId,
      version: 1,
      schemaVersion: 'lcp.record/0.1',
      author: { userId: userAlice.id, handle: '@alice', deviceId: 'mac-1' },
      origin: 'local',
      source: { agent: 'claude-code', agentVersion: '1.0', adapterVersion: '0.1', sessionId: 's1', eventRange: [1, 10], projectTag: 'api' },
      times: { sessionStart: new Date().toISOString(), sessionEnd: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      content: {
        title: 'Kafka Consumer Dead-Letter Queue',
        summary: 'Configured DLQ with 3 retries before dead-lettering.',
        decisions: [{ text: 'Use DLQ for failed payments', evidence: ['e_1'] }],
        filesTouched: ['src/kafka/consumer.ts']
      },
      sensitivity: { label: 'none', scrubberVersion: '0.1.0', redactionCounts: {} },
      visibility: { shareable: true, teamId: team.id, promotedAt: new Date().toISOString() },
      acl: { projectTag: 'api', teamId: team.id },
      feedback: { status: 'accepted', reviewedAt: new Date().toISOString() },
      provenance: { distiller: { runtime: 'local', model: 'test' }, supersedes: null }
    };

    upsertPromotedRecord({
      recordId,
      version: 1,
      teamId: team.id,
      authorId: userAlice.id,
      projectTag: 'api',
      schemaVersion: 'lcp.record/0.1',
      json: sampleRecord,
      sensitivity: 'none'
    });
  });

  it('Alice hands off a record to teammate Bob using @handle', async () => {
    const res = await client('POST', `/api/v1/teams/${team.id}/handoffs`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
      body: {
        to: '@bob_hnd',
        recordId
      }
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.handoff.from_user, userAlice.id);
    assert.strictEqual(body.handoff.to_user, userBob.id);
    assert.strictEqual(body.handoff.state, 'pending');
  });

  it('Bob receives the handoff in his inbox with record summary', async () => {
    const res = await client('GET', '/api/v1/inbox', {
      headers: { Authorization: `Bearer ${tokenBob}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.inbox.length, 1);
    const item = body.inbox[0];
    assert.strictEqual(item.fromHandle, '@alice_hnd');
    assert.strictEqual(item.teamName, 'Collaboration Team');
    assert.strictEqual(item.record.title, 'Kafka Consumer Dead-Letter Queue');
    assert.strictEqual(item.state, 'pending');
  });

  it('Bob marks the inbox item as read', async () => {
    // 1. Get inbox item ID
    const listRes = await client('GET', '/api/v1/inbox', {
      headers: { Authorization: `Bearer ${tokenBob}` }
    });
    const listBody = await listRes.json();
    const itemId = listBody.inbox[0].id;

    // 2. Mark as read
    const patchRes = await client('PATCH', `/api/v1/inbox/${itemId}`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
      body: { state: 'read' }
    });

    assert.strictEqual(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.item.state, 'read');
  });

  it('Rejects handoff to a user who is not a team member (tenant isolation)', async () => {
    const res = await client('POST', `/api/v1/teams/${team.id}/handoffs`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
      body: {
        to: '@eve_hnd', // Eve is not in team
        recordId
      }
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'FORBIDDEN');
  });

  it('Rejects handoff to oneself', async () => {
    const res = await client('POST', `/api/v1/teams/${team.id}/handoffs`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
      body: {
        to: '@alice_hnd',
        recordId
      }
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  });
});
