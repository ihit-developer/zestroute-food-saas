import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '../src/utils/crypto.js';
import { ProfileModel } from '../src/models/index.js';

describe('Security, Crypto & RBAC Middleware', () => {
  const app = createApp();

  it('hashes and verifies passwords without storing plaintext', async () => {
    const hash = await hashPassword('StrongPass123!');
    expect(hash).not.toContain('StrongPass123!');
    expect(await verifyPassword('StrongPass123!', hash)).toBe(true);
    expect(await verifyPassword('WrongPass', hash)).toBe(false);
  });

  it('signs and verifies JWT access tokens and SHA-256 refresh hashes', () => {
    const raw = generateOpaqueToken(32);
    expect(hashToken(raw)).toHaveLength(64);

    const jwt = signAccessToken({ sub: 'user123', roles: ['customer'], sessionId: 'sess1' });
    const decoded = verifyAccessToken(jwt);
    expect(decoded.sub).toBe('user123');
    expect(decoded.roles).toEqual(['customer']);
  });

  it('returns 200 on health endpoint', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects unauthenticated requests to protected routes with 401', async () => {
    const res = await request(app).get('/api/v1/admin/ping');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects customer role accessing super_admin route with 403', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({ sub: '507f1f77bcf86cd799439011', roles: ['customer'], sessionId: 's1' });
    const res = await request(app)
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    vi.restoreAllMocks();
  });

  it('allows super_admin role to access admin route', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({ sub: '507f1f77bcf86cd799439011', roles: ['super_admin'], sessionId: 's1' });
    const res = await request(app)
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.scope).toBe('super_admin');
    vi.restoreAllMocks();
  });

  it('rejects invalid login payloads via Zod validation (400)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
