import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  const saltedInput = `${plain}${env.PASSWORD_PEPPER}`;
  return bcrypt.hash(saltedInput, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const saltedInput = `${plain}${env.PASSWORD_PEPPER}`;
  return bcrypt.compare(saltedInput, hash);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateOpaqueToken(bytes: number = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateNumericOtp(digits: number = 6): string {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return String(crypto.randomInt(min, max));
}

export interface AccessTokenPayload {
  sub: string;
  roles: string[];
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
