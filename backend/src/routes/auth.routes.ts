import { Router } from 'express';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from '../validators/auth.validators.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerBodySchema), registerHandler);
authRouter.post('/login', authRateLimiter, validateBody(loginBodySchema), loginHandler);
authRouter.post('/refresh', authRateLimiter, validateBody(refreshBodySchema), refreshHandler);
authRouter.post('/logout', validateBody(refreshBodySchema), logoutHandler);
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordBodySchema),
  forgotPasswordHandler
);
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordBodySchema),
  resetPasswordHandler
);
authRouter.get('/me', authenticate, meHandler);
