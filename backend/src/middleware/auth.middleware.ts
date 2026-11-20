import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/crypto.js';
import { ProfileModel } from '../models/index.js';

export interface AuthContext {
  userId: string;
  roles: string[];
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' },
    });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    const profile = await ProfileModel.findById(payload.sub).select('accountStatus').lean();
    if (!profile || profile.accountStatus !== 'active') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended or inactive' },
      });
      return;
    }

    req.auth = {
      userId: payload.sub,
      roles: payload.roles,
      sessionId: payload.sessionId,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token' },
    });
  }
}
