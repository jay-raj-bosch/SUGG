/**
 * rateLimiter.ts — Simple in-memory rate limiter for auth endpoints.
 *
 * Prevents brute-force login attempts.
 * In production, use Redis-backed rate limiting for multi-instance deployments.
 */

import { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, RateEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > 15 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiter middleware.
 * @param maxAttempts Max requests within the window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const entry = store.get(key);

    if (!entry) {
      store.set(key, { count: 1, firstAttempt: now });
      next();
      return;
    }

    // Reset window if expired
    if (now - entry.firstAttempt > windowMs) {
      store.set(key, { count: 1, firstAttempt: now });
      next();
      return;
    }

    // Within window — check count
    entry.count++;
    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((windowMs - (now - entry.firstAttempt)) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many login attempts. Please try again later.",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}
