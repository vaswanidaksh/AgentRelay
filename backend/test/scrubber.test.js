import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scrubText, scrubObject } from '../src/core/scrubber.js';

describe('Deterministic Secret Scrubber (FR-007, M-1)', () => {
  it('redacts AWS Access Keys with [REDACTED:aws_key]', () => {
    const input = 'deploy --key AKIAIOSFODNN7EXAMPLE and secret';
    const { text, redactionCounts } = scrubText(input);
    assert.strictEqual(text, 'deploy --key [REDACTED:aws_key] and secret');
    assert.strictEqual(redactionCounts.aws_key, 1);
  });

  it('redacts GitHub Personal Access Tokens with [REDACTED:github_token]', () => {
    const input = 'curl -H "Authorization: token ghp_111122223333444455556666777788889999"';
    const { text, redactionCounts } = scrubText(input);
    assert.strictEqual(text, 'curl -H "Authorization: token [REDACTED:github_token]"');
    assert.strictEqual(redactionCounts.github_token, 1);
  });

  it('redacts OpenAI and Anthropic API keys with [REDACTED:ai_api_key]', () => {
    const input = 'OPENAI=sk-abcdefghijklmnopqrstuvwxyz1234567890\nANTHROPIC=sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
    const { text, redactionCounts } = scrubText(input);
    assert.match(text, /\[REDACTED:ai_api_key\]/);
    assert.strictEqual(redactionCounts.ai_api_key >= 1, true);
  });

  it('redacts DB connection strings with [REDACTED:db_connection]', () => {
    const input = 'connect to postgres://admin:supersecret@db.internal:5432/production';
    const { text, redactionCounts } = scrubText(input);
    assert.strictEqual(text, 'connect to [REDACTED:db_connection]');
    assert.strictEqual(redactionCounts.db_connection, 1);
  });

  it('redacts RSA/Private Keys with [REDACTED:private_key]', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----';
    const { text, redactionCounts } = scrubText(input);
    assert.strictEqual(text, '[REDACTED:private_key]');
    assert.strictEqual(redactionCounts.private_key, 1);
  });

  it('recursively scrubs deep JSON objects and aggregates counts', () => {
    const obj = {
      title: 'Database migration',
      summary: 'Connecting to postgres://user:pass@localhost:5432/mydb using key AKIAIOSFODNN7EXAMPLE',
      decisions: [
        { text: 'Set token to ghp_111122223333444455556666777788889999', evidence: ['e_1'] }
      ]
    };

    const { data, redactionCounts } = scrubObject(obj);
    assert.match(data.summary, /\[REDACTED:db_connection\]/);
    assert.match(data.summary, /\[REDACTED:aws_key\]/);
    assert.match(data.decisions[0].text, /\[REDACTED:github_token\]/);
    assert.strictEqual(redactionCounts.db_connection, 1);
    assert.strictEqual(redactionCounts.aws_key, 1);
    assert.strictEqual(redactionCounts.github_token, 1);
  });
});
