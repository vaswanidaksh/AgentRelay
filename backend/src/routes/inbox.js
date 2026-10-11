import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { requireTeamMember } from '../middleware/rbac.js';
import { findUserByHandle, findUserById } from '../db/queries/users.js';
import { getMembership } from '../db/queries/teams.js';
import { getRecord } from '../db/queries/records.js';
import {
  createHandoff,
  listInboxForUser,
  getHandoffById,
  updateHandoffState
} from '../db/queries/inbox.js';
import { logAuditEvent } from '../db/queries/audit.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../core/errors.js';

const router = express.Router();

/**
 * Creates a handoff assigning a context record to a teammate (PRD FR-023, §15.2).
 * POST /api/v1/teams/:id/handoffs
 */
router.post('/teams/:id/handoffs', requireAuth, requireTeamMember, (req, res, next) => {
  try {
    const { to, recordId } = req.body;

    if (!to || typeof to !== 'string') {
      throw new ValidationError('Recipient "to" (@handle or userId) is required.');
    }

    if (!recordId || typeof recordId !== 'string') {
      throw new ValidationError('recordId is required.');
    }

    // 1. Verify record exists in team
    const record = getRecord(req.teamId, recordId);
    if (!record) {
      throw new NotFoundError(`Record with ID ${recordId} not found in this team.`);
    }

    // 2. Resolve recipient user
    const recipient = to.startsWith('@') ? findUserByHandle(to) : (findUserById(to) || findUserByHandle(to));
    if (!recipient) {
      throw new NotFoundError(`Recipient user "${to}" not found.`);
    }

    if (recipient.id === req.user.id) {
      throw new ValidationError('Cannot hand off a record to yourself.');
    }

    // 3. Verify recipient is a member of this team (tenant isolation)
    const recipientMembership = getMembership(req.teamId, recipient.id);
    if (!recipientMembership) {
      throw new ForbiddenError(`User ${recipient.handle} is not a member of this team.`);
    }

    // 4. Create handoff entry
    const handoffId = `hnd_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const handoff = createHandoff({
      id: handoffId,
      teamId: req.teamId,
      fromUser: req.user.id,
      toUser: recipient.id,
      recordId
    });

    // 5. Tamper-evident audit event
    logAuditEvent({
      actorId: req.user.id,
      action: 'handoff_created',
      teamId: req.teamId,
      recordId,
      metadata: {
        handoffId,
        toUserId: recipient.id,
        toHandle: recipient.handle
      }
    });

    res.status(201).json({
      message: 'Handoff created successfully.',
      handoff
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Lists the authenticated user's inbox entries.
 * GET /api/v1/inbox
 */
router.get('/inbox', requireAuth, (req, res, next) => {
  try {
    const stateFilter = req.query.state || null;
    if (stateFilter && !['pending', 'read', 'archived'].includes(stateFilter)) {
      throw new ValidationError('Invalid state filter. Allowed: pending, read, archived.');
    }

    const items = listInboxForUser(req.user.id, stateFilter);
    res.json({
      inbox: items,
      totalCount: items.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Updates status of an inbox entry (e.g. mark read or archived).
 * PATCH /api/v1/inbox/:id
 */
router.patch('/inbox/:id', requireAuth, (req, res, next) => {
  try {
    const { state } = req.body;
    if (!['pending', 'read', 'archived'].includes(state)) {
      throw new ValidationError('Invalid state. Allowed: pending, read, archived.');
    }

    const updated = updateHandoffState(req.params.id, req.user.id, state);
    if (!updated) {
      throw new NotFoundError('Inbox item not found or access denied.');
    }

    res.json({
      message: 'Inbox item updated successfully.',
      item: updated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
