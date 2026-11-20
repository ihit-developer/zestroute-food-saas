import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { ProfileModel } from '../src/models/index.js';

describe('Advanced Features API (Modules 54-60)', () => {
  const app = createApp();

  it('requires customer authentication for recommendations (401)', async () => {
    const res = await request(app).get('/api/v1/advanced/recommendations');
    expect(res.status).toBe(401);
  });

  it('validates loyalty point redemption payload (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['customer'],
      sessionId: 's1',
    });

    const res = await request(app)
      .post('/api/v1/advanced/loyalty/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: -10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    vi.restoreAllMocks();
  });
});
