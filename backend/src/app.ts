import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { globalRateLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { customerRouter } from './routes/customer.routes.js';
import { restaurantRouter } from './routes/restaurant.routes.js';
import { riderRouter } from './routes/rider.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { advancedRouter } from './routes/advanced.routes.js';
import { authenticate } from './middleware/auth.middleware.js';
import { requireRole } from './middleware/rbac.middleware.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(globalRateLimiter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize());

  app.get('/', (_req, res) => {
    res.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZestRoute — Unified Platform Portal</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #FFF9F2; color: #292522; padding: 32px 20px; }
    .wrap { max-width: 920px; margin: 0 auto; }
    .hdr { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo { width: 42px; height: 42px; border-radius: 12px; background: #F47B20; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #F0E7DE; border-radius: 16px; padding: 20px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 8px rgba(41,37,34,.06); transition: border-color .15s, transform .15s; }
    .card:hover { border-color: #F47B20; transform: translateY(-2px); }
    .tag { display: inline-block; align-self: flex-start; padding: 3px 10px; border-radius: 999px; background: #FFF0E3; color: #D95F16; font-size: 12px; font-weight: 700; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 4px 0 0; font-size: 17px; }
    p { margin: 0; font-size: 13px; color: #81776E; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="logo">Z</div>
      <div>
        <h1>ZestRoute Platform Portal</h1>
        <p>Single hub for all 4 role interfaces &amp; centralized API</p>
      </div>
    </div>
    <div class="grid">
      <a class="card" href="http://localhost:5173" target="_blank">
        <span class="tag">Role: Restaurant Owner / Staff</span>
        <h2>Restaurant Dashboard</h2>
        <p>Orders, menu, inventory, branches, staff RBAC &amp; finance (:5173)</p>
      </a>
      <a class="card" href="http://localhost:5174" target="_blank">
        <span class="tag">Role: Super Admin</span>
        <h2>Super Admin Console</h2>
        <p>Approvals, global orders, coupons, refunds &amp; audit logs (:5174)</p>
      </a>
      <a class="card" href="http://localhost:8081" target="_blank">
        <span class="tag">Role: Customer</span>
        <h2>Customer App (Web/Mobile)</h2>
        <p>Discover restaurants, customize food, checkout &amp; track (:8081)</p>
      </a>
      <a class="card" href="http://localhost:8082" target="_blank">
        <span class="tag">Role: Delivery Rider</span>
        <h2>Rider App (Web/Mobile)</h2>
        <p>Online toggle, delivery requests, pickup &amp; OTP dropoff (:8082)</p>
      </a>
      <a class="card" href="/api/v1/health" target="_blank">
        <span class="tag">Backend Status</span>
        <h2>API &amp; MongoDB Health</h2>
        <p>Check live Express + MongoDB Atlas connection</p>
      </a>
      <a class="card" href="/api/v1/catalog/categories" target="_blank">
        <span class="tag">Database Seed</span>
        <h2>Global Categories JSON</h2>
        <p>Verify the 14 seeded categories from MongoDB Atlas</p>
      </a>
    </div>
  </div>
</body>
</html>`);
  });

  app.get(`${env.API_PREFIX}/health`, (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        dbState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/media`, mediaRouter);
  app.use(`${env.API_PREFIX}/catalog`, catalogRouter);
  app.use(`${env.API_PREFIX}/restaurant`, restaurantRouter);
  app.use(`${env.API_PREFIX}/rider`, riderRouter);
  app.use(`${env.API_PREFIX}/admin`, adminRouter);
  app.use(`${env.API_PREFIX}/payments`, paymentRouter);
  app.use(`${env.API_PREFIX}/advanced`, advancedRouter);

  // RBAC-protected admin probe endpoint for security verification
  app.get(`${env.API_PREFIX}/admin/ping`, authenticate, requireRole('super_admin'), (_req, res) => {
    res.status(200).json({ success: true, data: { scope: 'super_admin' } });
  });

  app.use(`${env.API_PREFIX}`, customerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
