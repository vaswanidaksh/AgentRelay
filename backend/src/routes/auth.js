import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import {
  findUserByGithubId,
  findUserById,
  createUser,
  createApiToken,
  revokeToken
} from '../db/queries/users.js';
import { ValidationError } from '../core/errors.js';

const router = express.Router();

/**
 * Exchanges GitHub credentials / device flow token for an LCP API token.
 */
router.post('/auth/github', async (req, res, next) => {
  try {
    const { githubId, handle } = req.body;
    if (!githubId || !handle) {
      throw new ValidationError('githubId and handle are required.');
    }

    let user = findUserByGithubId(githubId);
    if (!user) {
      const userId = `u_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      user = createUser({
        id: userId,
        githubId,
        handle: handle.startsWith('@') ? handle : `@${handle}`
      });
    }

    const rawToken = `lcp_pat_${crypto.randomBytes(24).toString('hex')}`;
    const tokenId = `tok_${uuidv4().slice(0, 8)}`;
    createApiToken({
      id: tokenId,
      userId: user.id,
      rawToken
    });

    res.status(200).json({
      token: rawToken,
      user: {
        id: user.id,
        githubId: user.github_id,
        handle: user.handle
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Returns the currently authenticated user.
 */
router.get('/me', requireAuth, (req, res) => {
  const user = findUserById(req.user.id);
  res.json({
    user: {
      id: user.id,
      githubId: user.github_id,
      handle: user.handle,
      createdAt: user.created_at
    }
  });
});

/**
 * Revokes the current API token.
 */
router.post('/auth/logout', requireAuth, (req, res) => {
  const rawToken = req.headers.authorization?.substring(7).trim();
  if (rawToken) {
    revokeToken(rawToken);
  }
  res.json({ message: 'Successfully logged out and revoked token.' });
});

export default router;
