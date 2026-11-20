# 07. REST API & Real-Time Socket.IO Contract

Base URL: `/api/v1` — Standard Envelope: `{ success: boolean, data?: T, error?: { code, message, details? }, meta?: { page, limit, total } }`.

---

## 1. REST API Endpoint Groups (Covering All 60 Modules)

| Domain | Base Path | Key Endpoints | Roles |
|---|---|---|---|
| **Auth & Sessions** | `/auth` | `POST /register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-phone`, `/google` | Public / Auth |
| **Profile & Prefs** | `/me` | `GET/PATCH /profile`, `POST /avatar`, `PATCH /password`, `GET/PATCH /preferences`, `POST/DELETE /devices`, `DELETE /account` | Auth |
| **Addresses** | `/addresses` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/default` | Customer |
| **Discovery & Catalog** | `/catalog` | `GET /home`, `/categories`, `/restaurants`, `/restaurants/:id`, `/restaurants/:id/menu`, `/foods/:id`, `/search` | Public / Customer |
| **Cart** | `/cart` | `GET /`, `POST /items`, `PATCH /items/:itemId`, `DELETE /items/:itemId`, `POST /coupon`, `DELETE /coupon`, `DELETE /` | Customer |
| **Orders (Customer)** | `/orders` | `POST /` (Idempotency-Key), `GET /`, `GET /:id`, `GET /:id/tracking`, `GET /:id/invoice`, `POST /:id/cancel`, `POST /:id/reorder` | Customer |
| **Payments & Wallet** | `/payments`, `/wallet` | `POST /payments/initiate`, `POST /payments/webhook/:provider`, `GET /wallet`, `GET /wallet/transactions`, `POST /refunds` | Customer / Webhook |
| **Reviews & Favorites** | `/reviews`, `/favorites` | `POST /reviews`, `GET /restaurants/:id/reviews`, `POST/DELETE /favorites`, `GET /favorites` | Customer |
| **Notifications & Support** | `/notifications`, `/support` | `GET /notifications`, `PATCH /:id/read`, `POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages`, `POST /complaints` | Auth |
| **Restaurant Ops** | `/restaurant` | `POST /apply`, `GET/PATCH /profile`, `CRUD /branches`, `CRUD /categories`, `CRUD /foods`, `CRUD /variants`, `CRUD /addons`, `CRUD /ingredients`, `CRUD /recipes`, `PATCH /stock`, `GET /orders`, `PATCH /orders/:id/status`, `CRUD /promotions`, `POST /reviews/:id/reply`, `CRUD /staff`, `GET /finance/summary`, `GET /reports/sales` | Restaurant Owner / Scoped Staff |
| **Rider Ops** | `/rider` | `POST /apply`, `GET/PATCH /profile`, `PATCH /status` (online/offline), `GET /requests`, `POST /requests/:id/accept`, `POST /requests/:id/reject`, `GET /deliveries/active`, `PATCH /deliveries/:id/pickup`, `POST /deliveries/:id/location`, `POST /deliveries/:id/complete` (OTP + proof), `GET /earnings`, `GET /history` | Rider |
| **Super Admin** | `/admin` | `GET /dashboard`, `GET/PATCH /customers`, `GET/PATCH /restaurants`, `PATCH /restaurants/:id/review`, `GET/PATCH /riders`, `PATCH /riders/:id/review`, `GET /orders`, `POST /orders/:id/assign-rider`, `CRUD /categories`, `CRUD /coupons`, `CRUD /banners`, `CRUD /commissions`, `GET /payments`, `PATCH /refunds/:id`, `GET /analytics`, `GET /analytics/export`, `GET/PATCH /settings`, `GET /audit-logs`, `GET/PATCH /complaints` | Super Admin |
| **Advanced (Ph. 15)** | `/advanced` | `GET /recommendations`, `CRUD /group-orders`, `CRUD /scheduled-orders`, `GET/POST /memberships`, `GET /loyalty`, `POST /loyalty/redeem`, `GET/POST /surprise-boxes`, `GET /campaigns` | Customer / Restaurant / Admin |

---

## 2. Socket.IO Real-Time Events

| Event Name | Direction | Room Target | Payload Summary |
|---|---|---|---|
| `order:new` | Server -> Restaurant | `restaurant:{id}` / `branch:{id}` | `{ orderId, orderNumber, totalMinor, itemsCount, createdAt }` |
| `order:status_changed` | Server -> Customer, Restaurant, Rider | `order:{orderId}`, `user:{customerId}` | `{ orderId, fromStatus, toStatus, timestamp, etaMinutes? }` |
| `delivery:offer` | Server -> Rider | `rider:{riderId}` | `{ assignmentId, deliveryId, restaurantName, distanceMeters, earningMinor, expiresAt }` |
| `delivery:offer_taken` | Server -> Other Riders | `rider:{riderId}` | `{ assignmentId }` |
| `rider:location_update` | Rider -> Server -> Order Room | `order:{orderId}` | `{ deliveryId, lat, lng, heading, speed, recordedAt }` |
| `notification:new` | Server -> User | `user:{userId}` | `{ notificationId, type, title, body, data }` |
| `support:message` | Server -> Ticket Participants | `ticket:{ticketId}` | `{ ticketId, messageId, senderRole, message, createdAt }` |
