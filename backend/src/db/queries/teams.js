import { getDb } from '../connection.js';
import crypto from 'crypto';
import { config } from '../../config.js';

export function createTeam({ id, name, createdBy }) {
  const db = getDb();
  const insertTeam = db.transaction(() => {
    db.prepare(`
      INSERT INTO teams (id, name, created_by)
      VALUES (?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name
    `).run(id, name, createdBy);

    // Creator is automatically an admin member
    db.prepare(`
      INSERT INTO memberships (team_id, user_id, role)
      VALUES (?, ?, 'admin')
      ON CONFLICT (team_id, user_id) DO UPDATE SET
        role = 'admin'
    `).run(id, createdBy);
  });

  insertTeam();
  return findTeamById(id);
}

export function findTeamById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
}

export function listTeamsForUser(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT t.id, t.name, t.created_by, t.created_at, m.role, m.joined_at
    FROM teams t
    JOIN memberships m ON t.id = m.team_id
    WHERE m.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId);
}

export function getMembership(teamId, userId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM memberships WHERE team_id = ? AND user_id = ?
  `).get(teamId, userId);
}

export function listMembers(teamId) {
  const db = getDb();
  return db.prepare(`
    SELECT u.id, u.handle, m.role, m.joined_at
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    WHERE m.team_id = ?
    ORDER BY m.joined_at ASC
  `).all(teamId);
}

export function removeMember(teamId, userId) {
  const db = getDb();
  return db.prepare(`
    DELETE FROM memberships WHERE team_id = ? AND user_id = ?
  `).run(teamId, userId);
}

export function createInvite({ id, teamId, rawToken, expiresAt, maxUses = 1 }) {
  const db = getDb();
  const tokenHash = crypto.createHmac('sha256', config.tokenPepper).update(rawToken).digest('hex');
  db.prepare(`
    INSERT INTO invites (id, team_id, token_hash, expires_at, max_uses, uses)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, teamId, tokenHash, expiresAt, maxUses);
  return { id, teamId, rawToken, expiresAt, maxUses };
}

export function findInviteByToken(rawToken) {
  const db = getDb();
  const tokenHash = crypto.createHmac('sha256', config.tokenPepper).update(rawToken).digest('hex');
  return db.prepare(`
    SELECT * FROM invites
    WHERE token_hash = ? AND datetime('now') < datetime(expires_at) AND uses < max_uses
  `).get(tokenHash);
}

export function acceptInvite(inviteId, userId) {
  const db = getDb();
  const join = db.transaction(() => {
    const invite = db.prepare('SELECT * FROM invites WHERE id = ?').get(inviteId);
    if (!invite || invite.uses >= invite.max_uses) {
      throw new Error('Invite is invalid or fully used');
    }

    db.prepare(`
      INSERT OR IGNORE INTO memberships (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(invite.team_id, userId);

    db.prepare(`
      UPDATE invites SET uses = uses + 1 WHERE id = ?
    `).run(inviteId);

    return invite.team_id;
  });

  return join();
}
