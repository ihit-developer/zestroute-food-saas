import rateLimit, { type Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

const createRateLimiter: (options?: Partial<Options>) => RequestHandler =
  typeof rateLimit === 'function'
    ? rateLimit
    : (rateLimit as unknown as { default: (options?: Partial<Options>) => RequestHandler }).default;

const isDev = env.NODE_ENV !== 'production';

export const globalRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDev ? Math.max(env.RATE_LIMIT_MAX_REQUESTS, 5000) : env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: isDev ? 120 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Try again shortly.' },
  },
});
