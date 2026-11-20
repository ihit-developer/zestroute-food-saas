import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Phase 16 Security Audit: Headers, Sanitization & Error Hygiene', () => {
  const app = createApp();

  it('sets Helmet security headers on API responses', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('returns structured 404 JSON without leaking stack traces', async () => {
    const res = await request(app).get('/api/v1/nonexistent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toContain('at ');
  });

  it('sanitizes NoSQL injection operators ($gt/$ne) in request payloads', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: { $ne: '' },
        password: { $gt: '' },
      });

    // Sanitized to empty object -> rejected cleanly by Zod validation (400), never reaching MongoDB
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
