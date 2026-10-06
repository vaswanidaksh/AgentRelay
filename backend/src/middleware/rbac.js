import { getMembership } from '../db/queries/teams.js';
import { NotFoundError, ForbiddenError } from '../core/errors.js';

/**
 * Middleware ensuring the authenticated user is a member of the team in params.
 * Responds with 404 to avoid leaking existence of cross-team resources (PRD §15.3).
 */
export function requireTeamMember(req, res, next) {
  const teamId = req.params.id || req.params.teamId;
  if (!teamId) {
    return next(new NotFoundError('Team ID not found in route parameters.'));
  }

  const membership = getMembership(teamId, req.user.id);
  if (!membership) {
    return next(new NotFoundError('Team not found or access denied.'));
  }

  req.membership = membership;
  req.teamId = teamId;
  next();
}

/**
 * Middleware ensuring the authenticated user has admin role in the team.
 */
export function requireTeamAdmin(req, res, next) {
  if (!req.membership || req.membership.role !== 'admin') {
    return next(new ForbiddenError('Admin privileges required for this action.'));
  }
  next();
}
