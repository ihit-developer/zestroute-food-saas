# 08. Production Setup, Deployment & Operations Guide

## 1. MongoDB Atlas Configuration (Mandatory Primary Database)

1. Provision a **MongoDB Atlas Replica Set** (M10+ for production; replica set is required for multi-document ACID transactions in `OrderService`, `RiderService`, `AdminService`, and `PaymentService`).
2. Enable **TLS/SSL** and restrict Network Access IP allowlists to your backend server / VPC.
3. Enable **Continuous Cloud Backups / Point-in-Time Recovery** in MongoDB Atlas.
4. Copy [backend/.env.example](file:///c:/Users/basit/Desktop/FOOD/backend/.env.example) to `backend/.env` and set `MONGODB_URI`, `MONGODB_DB_NAME`, and 64-character random hex secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
5. Run versioned migrations and legitimate reference data seed:
   ```bash
   npm --workspace=backend run migrate
   npm --workspace=backend run seed
   ```

---

## 2. External Service Credentials Checklist

| Service | Environment Variables | Notes |
|---|---|---|
| **MongoDB Atlas** | `MONGODB_URI`, `MONGODB_DB_NAME` | Required for all persistence & transactions |
| **JWT & Auth** | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER` | Required; never commit to git |
| **Media Storage** | `STORAGE_PROVIDER` (`cloudinary` or `s3`), `CLOUDINARY_*` or `S3_*` | Required for food/profile/document uploads |
| **Email / SMS OTP** | `SMTP_*`, `EMAIL_FROM`, `SMS_PROVIDER_API_KEY` | Required for live OTP delivery |
| **Push Notifications** | `EXPO_ACCESS_TOKEN` | Required for mobile push notifications |
| **Online Payments** | `JAZZCASH_*`, `EASYPAISA_*`, `CARD_GATEWAY_*` | Endpoints return `503 GATEWAY_NOT_CONFIGURED` until configured |

---

## 3. Building & Deploying Each Component

### A. Backend API + Socket.IO (`backend/`)
```bash
npm --workspace=backend run build
NODE_ENV=production npm --workspace=backend start
```
- Health check: `GET /api/v1/health` (returns HTTP 200 with MongoDB `readyState`).
- If scaling horizontally across multiple Node instances, attach `@socket.io/redis-adapter` and enable sticky sessions on the load balancer.

### B. Web Dashboards (`web-restaurant/` & `web-admin/`)
Set `VITE_API_URL=https://api.yourdomain.com/api/v1` at build time:
```bash
npm --workspace=web-restaurant run build   # Outputs web-restaurant/dist/
npm --workspace=web-admin run build        # Outputs web-admin/dist/
```
Serve both `dist/` bundles via any HTTPS static host / CDN with SPA fallback (`index.html`).

### C. Mobile Applications (`mobile-customer/` & `mobile-rider/`)
Set `EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`, then build Android/iOS binaries via **Expo EAS**:
```bash
npx eas build --platform android
npx eas build --platform ios
```

---

## 4. Monitoring & Incident Response
- **Audit Trail**: `audit_logs` stores immutable records for every admin approval, suspension, commission edit, and refund.
- **System Logs**: `system_logs` includes a 90-day TTL index for operational diagnostics.
- **Rate Limiting**: Global and strict `/auth/*` rate limiters are active in `backend/src/middleware/rateLimit.middleware.ts`.
