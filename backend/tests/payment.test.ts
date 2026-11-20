import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/utils/crypto.js';
import { ProfileModel } from '../src/models/index.js';
import { PaymentService } from '../src/services/payment.service.js';

describe('Payment Security & Webhook Verification', () => {
  const app = createApp();

  it('returns 503 GATEWAY_NOT_CONFIGURED instead of simulating online payment success', async () => {
    vi.spyOn(ProfileModel, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ accountStatus: 'active' }) }),
    } as never);

    const token = signAccessToken({
      sub: '507f1f77bcf86cd799439011',
      roles: ['customer'],
      sessionId: 's1',
    });

    const res = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: '507f1f77bcf86cd799439088',
        provider: 'jazzcash',
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GATEWAY_NOT_CONFIGURED');
    vi.restoreAllMocks();
  });

  it('verifies HMAC-SHA256 webhook signatures using timingSafeEqual', () => {
    const secret = 'test_webhook_secret_123';
    const payload = JSON.stringify({ paymentId: 'p1', status: 'paid' });
    const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(PaymentService.verifyHmacSignature(payload, validSig, secret)).toBe(true);
    expect(PaymentService.verifyHmacSignature(payload, 'deadbeef', secret)).toBe(false);
  });

  it('rejects tampered webhook signatures with 401', async () => {
    process.env.CARD_GATEWAY_WEBHOOK_SECRET = 'whsec_test_123';
    const res = await request(app)
      .post('/api/v1/payments/webhook/card')
      .set('x-webhook-signature', 'invalid_signature')
      .send({
        paymentId: '507f1f77bcf86cd799439011',
        providerTxId: 'tx_1',
        status: 'paid',
        amountMinor: 50000,
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    delete process.env.CARD_GATEWAY_WEBHOOK_SECRET;
  });
});
