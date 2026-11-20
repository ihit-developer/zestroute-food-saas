import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { OrderModel, ProfileModel } from '../src/models/index.js';

describe('Customer API Business Rules & Security', () => {
  const app = createApp();

  it('blocks riders from accessing customer cart/order routes (403)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const riderToken = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['rider'],
      sessionId: 's1',
    });

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    vi.restoreAllMocks();
  });

  it('requires Idempotency-Key header when creating an order (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const customerToken = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['customer'],
      sessionId: 's1',
    });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: '507f1f77bcf86cd799439012',
        paymentMethod: 'cod',
        tipMinor: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    vi.restoreAllMocks();
  });

  it('rejects reviews on non-delivered orders (400)', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);
    vi.spyOn(OrderModel, 'findOne').mockReturnValue({
      lean: async () => ({
        _id: '507f1f77bcf86cd799439099',
        customerId: '507f1f77bcf86cd799439011',
        status: 'preparing',
      }),
    } as never);

    const customerToken = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['customer'],
      sessionId: 's1',
    });

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: '507f1f77bcf86cd799439099',
        restaurantRating: 5,
        foodRating: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
    vi.restoreAllMocks();
  });
});
