import { getDb } from '../connection.js';
import crypto from 'crypto';
import { config } from '../../config.js';

export function hashToken(rawToken) {
  return crypto.createHmac('sha256', config.tokenPepper).update(rawToken).digest('hex');
}

export function findUserByGithubId(githubId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE github_id = ?').get(githubId);
}

export function findUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser({ id, githubId, handle }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (id, github_id, handle)
    VALUES (?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      github_id = excluded.github_id,
      handle = excluded.handle
  `).run(id, githubId, handle);
  return findUserById(id);
}

export function createApiToken({ id, userId, rawToken }) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  db.prepare(`
    INSERT INTO api_tokens (id, user_id, token_hash)
    VALUES (?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      token_hash = excluded.token_hash,
      revoked_at = NULL
  `).run(id, userId, tokenHash);
  return { id, userId, tokenHash };
}

export function findUserByToken(rawToken) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const row = db.prepare(`
    SELECT u.id, u.github_id, u.handle, t.id as token_id, t.revoked_at
    FROM api_tokens t
    JOIN users u ON t.user_id = u.id
    WHERE t.token_hash = ? AND t.revoked_at IS NULL
  `).get(tokenHash);

  if (row) {
    db.prepare(`
      UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?
    `).run(row.token_id);
  }

  return row;
}

export function revokeToken(rawToken) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  db.prepare(`
    UPDATE api_tokens SET revoked_at = datetime('now') WHERE token_hash = ?
  `).run(tokenHash);
}
