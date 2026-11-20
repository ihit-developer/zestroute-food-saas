import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { ProfileModel } from '../src/models/index.js';

describe('Super Admin API RBAC & Validation', () => {
  const app = createApp();

  it('blocks restaurant owners from accessing admin audit logs (403)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['restaurant_owner'],
      sessionId: 's1',
    });

    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    vi.restoreAllMocks();
  });

  it('validates restaurant review status payload for super_admin (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['super_admin'],
      sessionId: 's1',
    });

    const res = await request(app)
      .patch('/api/v1/admin/restaurants/507f1f77bcf86cd799439099/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    vi.restoreAllMocks();
  });
});
