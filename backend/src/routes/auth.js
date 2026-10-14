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
const handleAuth = async (req, res, next) => {
  try {
    let { githubId, handle, code, token, email } = req.body;

    if (!githubId && email) {
      const emailClean = email.toLowerCase().trim();
      githubId = `gh_${crypto.createHash('sha256').update(emailClean).digest('hex').slice(0, 10)}`;
      if (!handle) {
        handle = `@${emailClean.split('@')[0]}`;
      }
    } else if (!githubId && (code || token)) {
      const credential = code || token;
      githubId = `gh_${crypto.createHash('sha256').update(credential).digest('hex').slice(0, 10)}`;
      if (!handle) {
        handle = `@dev_${githubId.slice(3, 8)}`;
      }
    }

    if (!githubId || !handle) {
      throw new ValidationError('githubId and handle (or email, code, token) are required.');
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
        handle: user.handle,
        name: user.handle.replace(/^@/, '')
      }
    });
  } catch (err) {
    next(err);
  }
};

router.post('/auth/github', handleAuth);
router.post('/auth/login', handleAuth);

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
