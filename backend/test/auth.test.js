import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';

describe('Auth & Identity Flow (PRD §15.2, FR-016)', () => {
  let client;

  before(() => {
    client = createMockClient(app);
  });

  it('Exchanges GitHub login credentials for an LCP token and creates user', async () => {
    const res = await client('POST', '/api/v1/auth/github', {
      body: {
        githubId: 'gh_user_998877',
        handle: 'johndoe'
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.match(body.token, /^lcp_pat_/);
    assert.strictEqual(body.user.handle, '@johndoe');
    assert.strictEqual(body.user.githubId, 'gh_user_998877');
  });

  it('Resolves user details on GET /api/v1/me with Bearer token', async () => {
    // 1. Authenticate
    const authRes = await client('POST', '/api/v1/auth/github', {
      body: {
        githubId: 'gh_user_554433',
        handle: 'sarahconnor'
      }
    });
    const authBody = await authRes.json();
    const token = authBody.token;

    // 2. Query /me
    const meRes = await client('GET', '/api/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.user.handle, '@sarahconnor');
    assert.strictEqual(meBody.user.githubId, 'gh_user_554433');
  });

  it('Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await client('GET', '/api/v1/me');
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });
});
