import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';
import { createUser, createApiToken } from '../src/db/queries/users.js';
import { createTeam, createInvite, acceptInvite } from '../src/db/queries/teams.js';
import { logAuditEvent, verifyAuditChain } from '../src/db/queries/audit.js';
import { getDb } from '../src/db/connection.js';

describe('Tamper-Evident Audit Trail API (PRD §14.2, §20)', () => {
  const run = Date.now();
  let client;
  let admin, adminToken;
  let member, memberToken;
  let teamId;

  function makeTeamWithEvents(suffix, count) {
    const team = createTeam({ id: `t_audit_${suffix}_${run}`, name: `Audit ${suffix}`, createdBy: admin.id });
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(logAuditEvent({
        actorId: admin.id,
        action: i % 2 === 0 ? 'record_promoted' : 'records_pulled',
        teamId: team.id,
        recordId: i % 2 === 0 ? `rec_${i}` : null,
        metadata: { i }
      }));
    }
    return { team, ids };
  }

  before(() => {
    client = createMockClient(app);

    admin = createUser({ id: 'u_audit_admin', githubId: 'gh_audit_admin', handle: '@audit_admin' });
    member = createUser({ id: 'u_audit_member', githubId: 'gh_audit_member', handle: '@audit_member' });
    adminToken = 'lcp_pat_audit_admin_token';
    memberToken = 'lcp_pat_audit_member_token';
    createApiToken({ id: 'tok_audit_admin', userId: admin.id, rawToken: adminToken });
    createApiToken({ id: 'tok_audit_member', userId: member.id, rawToken: memberToken });

    const { team } = makeTeamWithEvents('main', 5);
    teamId = team.id;

    const invite = createInvite({
      id: `inv_audit_${run}`,
      teamId,
      rawToken: `inv_audit_token_${run}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    acceptInvite(invite.id, member.id);
  });

  it('Admin lists audit events newest-first with actor handles', async () => {
    const res = await client('GET', `/api/v1/teams/${teamId}/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.events.length, 5);
    assert.strictEqual(body.events[0].actorHandle, '@audit_admin');
    assert.deepStrictEqual(body.events[0].metadata, { i: 4 });
    // Strictly descending sequence
    for (let i = 1; i < body.events.length; i++) {
      assert.ok(body.events[i - 1].seq > body.events[i].seq);
    }
    assert.strictEqual(body.nextCursor, null);
  });

  it('Filters by action', async () => {
    const res = await client('GET', `/api/v1/teams/${teamId}/audit?action=records_pulled`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(body.events.length, 2);
    assert.ok(body.events.every(e => e.action === 'records_pulled'));
  });

  it('Paginates with a keyset cursor without gaps or duplicates', async () => {
    const page1 = await (await client('GET', `/api/v1/teams/${teamId}/audit?limit=3`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })).json();
    assert.strictEqual(page1.events.length, 3);
    assert.ok(page1.nextCursor);

    const page2 = await (await client('GET', `/api/v1/teams/${teamId}/audit?limit=3&before=${page1.nextCursor}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })).json();
    assert.strictEqual(page2.events.length, 2);

    const allIds = [...page1.events, ...page2.events].map(e => e.id);
    assert.strictEqual(new Set(allIds).size, 5);
  });

  it('Rejects invalid limit with 400', async () => {
    const res = await client('GET', `/api/v1/teams/${teamId}/audit?limit=999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 400);
  });

  it('Non-admin members are forbidden (403)', async () => {
    const res = await client('GET', `/api/v1/teams/${teamId}/audit`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual((await res.json()).error.code, 'FORBIDDEN');
  });

  it('Verify endpoint reports an intact chain', async () => {
    const res = await client('GET', `/api/v1/teams/${teamId}/audit/verify`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.valid, true);
    // 5 seeded events + the team_joined-style events are not logged by queries, so exactly 5
    assert.strictEqual(body.checked, 5);
    assert.match(body.headHash, /^[0-9a-f]{64}$/);
  });

  it('Detects an edited historical row (content tampering)', () => {
    const { team, ids } = makeTeamWithEvents('edit', 4);
    getDb().prepare('UPDATE audit_events SET metadata = ? WHERE id = ?')
      .run(JSON.stringify({ i: 'forged' }), ids[1]);

    const result = verifyAuditChain(team.id);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.brokenAt.id, ids[1]);
    assert.strictEqual(result.brokenAt.reason, 'CONTENT_HASH_MISMATCH');
  });

  it('Detects a deleted historical row', () => {
    const { team, ids } = makeTeamWithEvents('delete', 4);
    getDb().prepare('DELETE FROM audit_events WHERE id = ?').run(ids[1]);

    const result = verifyAuditChain(team.id);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.brokenAt.id, ids[2]);
    assert.strictEqual(result.brokenAt.reason, 'PREV_HASH_MISMATCH');
  });

  it('Chains are isolated per team', () => {
    const a = makeTeamWithEvents('iso_a', 2);
    const b = makeTeamWithEvents('iso_b', 2);
    assert.strictEqual(verifyAuditChain(a.team.id).valid, true);
    assert.strictEqual(verifyAuditChain(b.team.id).valid, true);
  });
});
