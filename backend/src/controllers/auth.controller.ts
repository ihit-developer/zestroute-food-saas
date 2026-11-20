import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ProfileModel } from '../models/index.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.register({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.login({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tokens = await AuthService.refresh(
      req.body.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    res.status(200).json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.logout(req.body.refreshToken);
    res.status(200).json({ success: true, data: { loggedOut: true } });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.requestOtp(req.body.identifier);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.resetPasswordWithOtp(
      req.body.identifier,
      req.body.otp,
      req.body.newPassword
    );
    res.status(200).json({ success: true, data: { passwordUpdated: true } });
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await ProfileModel.findById(req.auth?.userId).lean();
    res.status(200).json({
      success: true,
      data: { profile, roles: req.auth?.roles ?? [] },
    });
  } catch (err) {
    next(err);
  }
}
