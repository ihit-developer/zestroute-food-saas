# ZestRoute — Food Ordering & Delivery Platform

A commercial-grade, multi-restaurant Food Ordering & Delivery Management Platform built with **React Native (Expo + Expo Router)**, **React (Vite + TypeScript)**, **Node.js + Express.js**, **Socket.IO**, and **MongoDB Atlas (Mongoose)**.

---

## Applications

| Workspace | Stack | Purpose |
|---|---|---|
| `mobile-customer/` | React Native, Expo, Expo Router, TypeScript | Customer food discovery, customization, cart, checkout, live tracking, wallet, support |
| `mobile-rider/` | React Native, Expo, Expo Router, TypeScript | Rider registration, online toggle, atomic delivery acceptance, pickup, OTP dropoff, earnings |
| `web-restaurant/` | React, TypeScript, Vite, Recharts | Restaurant portal: live orders, menu & customizations, inventory, branches, staff RBAC, finance |
| `web-admin/` | React, TypeScript, Vite, Recharts | Super Admin console: approvals, global orders, categories, coupons, banners, refunds, audit logs |
| `backend/` | Node.js, Express.js, Mongoose, Socket.IO, Zod | Centralized REST API (`/api/v1`), 63 MongoDB collections, RBAC, real-time & payment webhooks |
| `shared/` | Pure TypeScript | Design tokens (`#F47B20`, `#FFF9F2`), Light/Dark & Urdu RTL helpers, `paisa` money math, HTTP/Auth client |

---

## Quick Start

1. **Install dependencies** (from repository root):
   ```bash
   npm install
   ```
2. **Configure backend environment**:
   Copy `backend/.env.example` to `backend/.env` and provide your **MongoDB Atlas** `MONGODB_URI` and secrets.
3. **Run MongoDB migrations & reference seed**:
   ```bash
   npm --workspace=backend run migrate
   npm --workspace=backend run seed
   ```
4. **Start development servers**:
   ```bash
   npm run dev:backend      # Express + Socket.IO on :5000
   npm run dev:restaurant   # Restaurant Web on :5173
   npm run dev:admin        # Super Admin Web on :5174
   npm run dev:customer     # Customer Mobile (Expo)
   npm run dev:rider        # Rider Mobile (Expo)
   ```
5. **Verify quality & tests**:
   ```bash
   npm run typecheck
   npm --workspace=backend test
   ```

---

## Documentation
- [01-system-architecture.md](documentation/01-system-architecture.md)
- [02-folder-and-app-structure.md](documentation/02-folder-and-app-structure.md)
- [03-navigation-architecture.md](documentation/03-navigation-architecture.md)
- [04-database-architecture.md](documentation/04-database-architecture.md)
- [05-rbac-and-security-architecture.md](documentation/05-rbac-and-security-architecture.md)
- [06-component-and-ui-strategy.md](documentation/06-component-and-ui-strategy.md)
- [07-api-and-realtime-contract.md](documentation/07-api-and-realtime-contract.md)
- [08-deployment-and-operations.md](documentation/08-deployment-and-operations.md)
- [DEVELOPMENT_PROGRESS.md](documentation/DEVELOPMENT_PROGRESS.md)
