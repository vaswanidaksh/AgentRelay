import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { requireTeamMember, requireTeamAdmin } from '../middleware/rbac.js';
import {
  createTeam,
  listTeamsForUser,
  findTeamById,
  createInvite,
  findInviteByToken,
  acceptInvite,
  listMembers,
  removeMember
} from '../db/queries/teams.js';
import { ValidationError, NotFoundError, ConflictError } from '../core/errors.js';
import { logAuditEvent } from '../db/queries/audit.js';

const router = express.Router();

/**
 * Creates a new team with the caller as admin.
 */
router.post('/teams', requireAuth, (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Team name is required.');
    }

    const teamId = `t_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const team = createTeam({
      id: teamId,
      name: name.trim(),
      createdBy: req.user.id
    });

    logAuditEvent({
      actorId: req.user.id,
      action: 'team_created',
      teamId: team.id,
      metadata: { name: team.name }
    });

    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * Lists teams the authenticated user belongs to.
 */
router.get('/teams', requireAuth, (req, res, next) => {
  try {
    const teams = listTeamsForUser(req.user.id);
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

/**
 * Creates an expiring team invite (admin only).
 */
router.post('/teams/:id/invites', requireAuth, requireTeamMember, requireTeamAdmin, (req, res, next) => {
  try {
    const { maxUses = 1, expiresInHours = 48 } = req.body;
    const inviteId = `inv_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const rawToken = `inv_${crypto.randomBytes(18).toString('hex')}`;
    
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const invite = createInvite({
      id: inviteId,
      teamId: req.teamId,
      rawToken,
      expiresAt,
      maxUses
    });

    logAuditEvent({
      actorId: req.user.id,
      action: 'invite_created',
      teamId: req.teamId,
      metadata: { inviteId, maxUses, expiresAt }
    });

    res.status(201).json({
      invite: {
        id: invite.id,
        teamId: invite.teamId,
        inviteToken: rawToken,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Accepts an invite to join a team.
 */
router.post('/invites/:token/accept', requireAuth, (req, res, next) => {
  try {
    const { token } = req.params;
    const invite = findInviteByToken(token);
    if (!invite) {
      throw new NotFoundError('Invite not found, expired, or fully used.');
    }

    const teamId = acceptInvite(invite.id, req.user.id);

    logAuditEvent({
      actorId: req.user.id,
      action: 'team_joined',
      teamId,
      metadata: { inviteId: invite.id }
    });

    const team = findTeamById(teamId);
    res.json({
      message: 'Successfully joined team.',
      team
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Lists all members of a team.
 */
router.get('/teams/:id/members', requireAuth, requireTeamMember, (req, res, next) => {
  try {
    const members = listMembers(req.teamId);
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

/**
 * Removes a member from a team (admin only).
 */
router.delete('/teams/:id/members/:userId', requireAuth, requireTeamMember, requireTeamAdmin, (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      throw new ConflictError('Cannot remove yourself from the team.');
    }

    removeMember(req.teamId, userId);

    logAuditEvent({
      actorId: req.user.id,
      action: 'member_removed',
      teamId: req.teamId,
      metadata: { removedUserId: userId }
    });

    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
