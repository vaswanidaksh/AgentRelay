import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTeamMember, requireTeamAdmin } from '../middleware/rbac.js';
import { listAuditEventsForTeam, verifyAuditChain } from '../db/queries/audit.js';
import { ValidationError } from '../core/errors.js';

const router = express.Router();

/**
 * Lists a team's tamper-evident audit trail (PRD §14.2, §20).
 * Admin-only: the log reveals who pulled/promoted/withdrew what.
 *
 * GET /api/v1/teams/:id/audit?action=&recordId=&actorId=&before=&limit=
 */
router.get('/teams/:id/audit', requireAuth, requireTeamMember, requireTeamAdmin, (req, res, next) => {
  try {
    const { action, recordId, actorId } = req.query;

    const limit = req.query.limit === undefined ? 50 : parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError('limit must be an integer between 1 and 200.');
    }

    let before;
    if (req.query.before !== undefined) {
      before = parseInt(req.query.before, 10);
      if (!Number.isInteger(before) || before < 1) {
        throw new ValidationError('before must be a positive integer cursor.');
      }
    }

    const events = listAuditEventsForTeam(req.teamId, { action, recordId, actorId, before, limit });
    const nextCursor = events.length === limit ? events[events.length - 1].seq : null;

    res.json({ events, nextCursor });
  } catch (err) {
    next(err);
  }
});

/**
 * Verifies the integrity of a team's audit hash chain.
 * GET /api/v1/teams/:id/audit/verify
 */
router.get('/teams/:id/audit/verify', requireAuth, requireTeamMember, requireTeamAdmin, (req, res, next) => {
  try {
    res.json(verifyAuditChain(req.teamId));
  } catch (err) {
    next(err);
  }
});

export default router;
