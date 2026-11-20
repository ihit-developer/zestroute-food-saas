import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { ProfileModel, RestaurantModel, RestaurantStaffModel } from '../src/models/index.js';

describe('Restaurant API RBAC, Ownership & Validation', () => {
  const app = createApp();

  it('blocks unauthorized users from accessing another restaurant orders (403)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);
    vi.spyOn(RestaurantModel, 'findOne').mockReturnValue({
      select: () => ({ lean: async () => null }),
    } as never);
    vi.spyOn(RestaurantStaffModel, 'findOne').mockReturnValue({
      lean: async () => null,
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['restaurant_owner'],
      sessionId: 's1',
    });

    const res = await request(app)
      .get('/api/v1/restaurant/507f1f77bcf86cd799439099/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_RESTAURANT');
    vi.restoreAllMocks();
  });

  it('rejects negative stock quantities via Zod validation (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);
    vi.spyOn(RestaurantModel, 'findOne').mockReturnValue({
      select: () => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439099' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['restaurant_owner'],
      sessionId: 's1',
    });

    const res = await request(app)
      .patch('/api/v1/restaurant/507f1f77bcf86cd799439099/stock')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ingredientId: '507f1f77bcf86cd799439021',
        branchId: '507f1f77bcf86cd799439022',
        quantity: -3,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    vi.restoreAllMocks();
  });
});
