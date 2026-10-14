import crypto from 'crypto';
import { RateLimitError } from '../core/errors.js';

/**
 * In-memory fixed-window rate limiter (PRD §15.3, Threat T-06).
 *
 * Keyed by a hash of the Bearer token when present (so a single user can't
 * dodge limits by switching IPs), otherwise by socket address. We deliberately
 * do NOT trust X-Forwarded-For here, since it is client-controlled.
 *
 * Note: state is per-process. Fine for the single-instance SQLite MVP; a
 * multi-instance deployment would need a shared store (e.g. Redis).
 */
export function defaultKey(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      return `tok:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 24)}`;
    }
  }
  return `ip:${req.socket?.remoteAddress ?? 'unknown'}`;
}

export function createRateLimiter({ windowMs, max, keyFn = defaultKey, name = 'api' }) {
  const buckets = new Map();

  // Periodically drop expired buckets so memory stays bounded.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(windowMs, 1000));
  sweeper.unref?.();

  function middleware(req, res, next) {
    const now = Date.now();
    const key = `${name}:${keyFn(req)}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return next(new RateLimitError(undefined, { retryAfterSeconds: resetSeconds }));
    }

    next();
  }

  middleware.reset = () => buckets.clear();
  return middleware;
}
