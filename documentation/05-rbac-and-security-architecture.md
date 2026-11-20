# 05. RBAC, Ownership & Security Architecture

## 1. Role & Permission Matrix

| Capability / Domain | Customer | Restaurant Owner | Restaurant Staff (Scoped) | Delivery Rider | Super Admin |
|---|---|---|---|---|---|
| Browse Approved Restaurants & Menus | Yes (Public/Auth) | Own + Public | Own + Public | Public | All (incl. pending/suspended) |
| Cart, Checkout, Addresses, Favorites | Own only | No | No | No | View for support (audited) |
| Orders: Create | Own | No | No | No | No |
| Orders: Read | Own orders only | Own restaurant orders | Own branch/restaurant (`orders` perm) | Assigned deliveries only | All orders |
| Orders: Accept / Reject / Prep Status | Cancel (within policy) | Own restaurant | Own branch/restaurant (`orders` perm) | No | Override (audited) |
| Delivery: Accept / Pickup / Complete | No | No | No | Assigned/Offered only | Reassign rider (audited) |
| Restaurant Menu, Variants, Add-ons | Read active only | Full CRUD (own) | Scoped (`menu` perm) | Read pickup items | Read + Moderate |
| Restaurant Inventory & Recipes | No | Full CRUD (own) | Scoped (`inventory` perm) | No | Read |
| Restaurant Staff & Permissions | No | Full CRUD (own) | No | No | Read/Suspend |
| Restaurant & Rider Approvals | No | Apply only | No | Apply only | Approve / Reject / Suspend |
| Global Categories, Coupons, Banners | Read active | Read active | Read active | No | Full CRUD |
| Commissions, Payouts, App Settings | No | Read own financials | Scoped (`reports` perm) | Read own earnings | Full CRUD (audited) |
| Reviews | Create on own delivered order | Reply only (no delete) | Reply if permitted | View own ratings | Moderate (audited) |
| Wallet & Loyalty | Read own; redeem via checkout/API | No | No | No | Audited credit/adjustment |
| Audit Logs & System Logs | No | No | No | No | Read only (immutable) |

---

## 2. Express.js Security Middleware Pipeline

Every protected route executes in strict order:
1. **`helmet()` + Strict CORS**: Whitelisted origins from `CORS_ORIGINS`.
2. **`rateLimiter`**: Global limiter + strict auth/OTP/checkout limiters (`5–10 req/min` on login/OTP).
3. **`mongoSanitize()`**: Strips `$` and `.` keys from `req.body`, `req.query`, `req.params` to block NoSQL injection.
4. **`authenticate`**: Verifies `Authorization: Bearer <accessToken>` (15m expiry), checks `profiles.accountStatus === 'active'`, attaches `req.auth = { userId, roles, staffContext }`.
5. **`requireRole(...roles)`**: Rejects (`403`) if user lacks required role.
6. **`requirePermission(scope)`**: For `restaurant_staff`, verifies `restaurant_staff_permissions` contains `scope` and constrains `branchId` if staff is branch-scoped.
7. **`requireOwnership(resourceLoader)`**: Verifies `resource.customerId === req.auth.userId`, `resource.restaurantId === req.auth.restaurantId`, or `resource.riderId === req.auth.riderId`.
8. **`validate(zodSchema)`**: Strict Zod parsing (strips unknown fields).
9. **`auditLog` (on sensitive mutations)**: Writes immutable record to `audit_logs`.

---

## 3. Authentication & Session Lifecycle

- **Password Hashing**: `argon2id` (with `bcryptjs` fallback if native build constrained) — plaintext passwords never logged or stored.
- **OTP Verification**: Real email/SMS OTPs stored as salted hashes with 5–10 minute TTL and max 5 attempts; no hardcoded/fake OTP bypasses.
- **Tokens**:
  - **Access Token**: Short-lived JWT (`15m`), signed with `JWT_ACCESS_SECRET`, stored in memory (web) or `expo-secure-store` (mobile).
  - **Refresh Token**: Opaque random token (`30d`), stored as SHA-256 hash in `user_sessions`, rotated on every `/auth/refresh` call; reuse of a rotated token revokes the entire session family.
- **Logout**: Revokes `user_sessions` record server-side and clears client secure storage.

---

## 4. Socket.IO Authorization & Room Model

- **Handshake**: Clients pass `auth: { token: accessToken }` on Socket.IO connection; unauthenticated sockets are disconnected immediately.
- **Server-Assigned Rooms** (clients cannot arbitrarily join other users' rooms):
  - `user:{userId}` — personal notifications, wallet/order updates
  - `restaurant:{restaurantId}` / `branch:{branchId}` — new orders & prep updates (verified owner/staff only)
  - `rider:{riderId}` — delivery offers (verified approved rider only)
  - `order:{orderId}` — live tracking room (joined only after verifying caller is the order's `customerId`, `restaurantId`, assigned `riderId`, or `super_admin`)
- **Location Updates**: Rider GPS events validated for rate, coordinates, and active assignment before broadcasting to `order:{orderId}`.

---

## 5. Payment & File Upload Security

- **Payment Webhooks**: Verified via HMAC/gateway signature + server-to-server status query; raw card numbers/CVVs are **never** collected, transmitted through our API, or stored.
- **File Uploads**: `multer` memory buffer with strict MIME allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf` for docs) and max size (`5MB`), uploaded server-side to Cloudinary/S3; returned URLs stored in MongoDB.
