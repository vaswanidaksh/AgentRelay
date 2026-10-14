import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { app } from '../src/server.js';
import { createMockClient } from './helpers/mockClient.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { config } from '../src/config.js';

describe('Server Hardening — Payload Limits & Rate Limiting (PRD §15.3, Threat T-06)', () => {
  let client;

  before(() => {
    client = createMockClient(app);
  });

  it('Rejects oversized bodies with 413 PAYLOAD_TOO_LARGE before auth/route logic', async () => {
    const huge = { name: 'x'.repeat(config.maxBodyBytes + 1024) };
    const res = await client('POST', '/api/v1/teams', { body: huge });

    assert.strictEqual(res.status, 413);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.strictEqual(body.error.details.limitBytes, config.maxBodyBytes);
  });

  it('Returns 400 (not 500) for malformed JSON', async () => {
    const res = await client('POST', '/api/v1/teams', {
      headers: { 'Content-Type': 'application/json' },
      body: '{"name": broken'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual((await res.json()).error.code, 'VALIDATION_ERROR');
  });

  it('Main app advertises RateLimit-* headers on API routes', async () => {
    const res = await client('GET', '/api/v1/me');
    assert.strictEqual(res.headers['ratelimit-limit'], String(config.rateLimitMax));
    assert.ok(res.headers['ratelimit-remaining'] !== undefined);
  });

  it('Health check is not rate limited', async () => {
    const res = await client('GET', '/healthz');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['ratelimit-limit'], undefined);
  });

  describe('Rate limiter behaviour (isolated app)', () => {
    let limited;
    let limiter;

    before(() => {
      limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 3 });
      const mini = express();
      mini.use(limiter);
      mini.get('/ping', (req, res) => res.json({ ok: true }));
      mini.use(errorHandler);
      limited = createMockClient(mini);
    });

    it('Allows up to max requests, then returns 429 with Retry-After', async () => {
      const headers = { Authorization: 'Bearer token_A' };
      for (let i = 0; i < 3; i++) {
        const ok = await limited('GET', '/ping', { headers });
        assert.strictEqual(ok.status, 200);
        assert.strictEqual(ok.headers['ratelimit-remaining'], String(2 - i));
      }

      const blocked = await limited('GET', '/ping', { headers });
      assert.strictEqual(blocked.status, 429);
      const body = await blocked.json();
      assert.strictEqual(body.error.code, 'RATE_LIMITED');
      assert.ok(Number(blocked.headers['retry-after']) > 0);
    });

    it('Buckets are per-token: another user is unaffected', async () => {
      const res = await limited('GET', '/ping', { headers: { Authorization: 'Bearer token_B' } });
      assert.strictEqual(res.status, 200);
    });

    it('reset() clears all buckets', async () => {
      limiter.reset();
      const res = await limited('GET', '/ping', { headers: { Authorization: 'Bearer token_A' } });
      assert.strictEqual(res.status, 200);
    });
  });
});
