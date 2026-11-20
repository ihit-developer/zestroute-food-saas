import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { ProfileModel, RiderModel } from '../src/models/index.js';

describe('Rider API RBAC, Approval & Validation', () => {
  const app = createApp();

  it('blocks customers from accessing rider endpoints (403)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['customer'],
      sessionId: 's1',
    });

    const res = await request(app)
      .get('/api/v1/rider/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    vi.restoreAllMocks();
  });

  it('prevents unapproved riders from going online (403)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);
    vi.spyOn(RiderModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439055',
      status: 'pending',
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['rider'],
      sessionId: 's1',
    });

    const res = await request(app)
      .patch('/api/v1/rider/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ isOnline: true });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('RIDER_NOT_APPROVED');
    vi.restoreAllMocks();
  });

  it('validates delivery completion OTP format (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['rider'],
      sessionId: 's1',
    });

    const res = await request(app)
      .post('/api/v1/rider/deliveries/507f1f77bcf86cd799439077/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: '12' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    vi.restoreAllMocks();
  });
});
