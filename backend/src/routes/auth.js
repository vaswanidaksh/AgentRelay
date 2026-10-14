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
import { config } from '../config.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GitHub OAuth — real browser-redirect flow
// ---------------------------------------------------------------------------

/**
 * GET /auth/github/authorize
 * Redirects the browser to GitHub's OAuth consent screen.
 */
router.get('/auth/github/authorize', (req, res) => {
  if (!config.githubClientId) {
    return res.status(500).json({
      error: { message: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env.' }
    });
  }

  // CSRF protection — store a random state in a short-lived httpOnly cookie
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('gh_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: `http://localhost:${config.port}/api/v1/auth/github/callback`,
    scope: 'read:user user:email',
    state,
  });

  return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * GET /auth/github/callback
 * GitHub redirects here after the user approves (or denies) the OAuth request.
 * Exchanges code → GitHub access token → fetches profile → creates local user
 * → mints LCP token → redirects frontend to /auth/callback with credentials.
 */
router.get('/auth/github/callback', async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${config.clientOrigin}/login?error=github_denied`);
    }

    // Verify CSRF state
    const cookieState = req.cookies?.gh_oauth_state;
    if (!cookieState || cookieState !== state) {
      return res.redirect(`${config.clientOrigin}/login?error=invalid_state`);
    }
    res.clearCookie('gh_oauth_state');

    if (!code) {
      return res.redirect(`${config.clientOrigin}/login?error=missing_code`);
    }

    // Exchange code for GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: `http://localhost:${config.port}/api/v1/auth/github/callback`,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[Auth] GitHub token exchange failed:', tokenData);
      return res.redirect(`${config.clientOrigin}/login?error=github_token_failed`);
    }

    // Fetch GitHub user profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const profile = await profileRes.json();

    if (!profile.id) {
      console.error('[Auth] GitHub profile fetch failed:', profile);
      return res.redirect(`${config.clientOrigin}/login?error=github_profile_failed`);
    }

    const githubId = `gh_${profile.id}`;
    const handle = `@${profile.login}`;

    // Find or create local user
    let user = findUserByGithubId(githubId);
    if (!user) {
      const userId = `u_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      user = createUser({ id: userId, githubId, handle });
    }

    // Mint an LCP API token
    const rawToken = `lcp_pat_${crypto.randomBytes(24).toString('hex')}`;
    const tokenId = `tok_${uuidv4().slice(0, 8)}`;
    createApiToken({ id: tokenId, userId: user.id, rawToken });

    console.log(`✔ GitHub OAuth successful — user: ${profile.login} (${user.id})`);

    // Pass token + user to the frontend via query params
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      githubId: user.github_id,
      handle: user.handle,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
    }));

    return res.redirect(
      `${config.clientOrigin}/auth/callback?token=${encodeURIComponent(rawToken)}&user=${userData}`
    );
  } catch (err) {
    next(err);
  }
});

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
