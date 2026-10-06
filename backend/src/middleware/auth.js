import { findUserByToken } from '../db/queries/users.js';
import { UnauthorizedError } from '../core/errors.js';

/**
 * Express middleware to authenticate requests via Bearer token.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header.'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Token not provided.'));
  }

  const user = findUserByToken(token);
  if (!user) {
    return next(new UnauthorizedError('Invalid or expired API token.'));
  }

  req.user = user;
  next();
}
