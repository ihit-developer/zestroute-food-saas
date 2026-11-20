# 02. Folder & Application Structure

## 1. Monorepo Workspace Layout

The project uses **npm workspaces** at `c:\Users\basit\Desktop\FOOD\package.json`, directly matching Section 20 of the Master Prompt:

```text
FOOD/
├── package.json                  # npm workspaces root + convenience scripts
├── .gitignore                    # Node, Expo, Vite, secrets, build artifacts
├── documentation/                # Architecture, contracts, progress tracker
│
├── shared/                       # @zestroute/shared (pure TypeScript, zero platform deps)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/                # Domain interfaces, DTOs, API response envelopes
│       ├── constants/            # Design tokens, roles, permissions, order statuses, enums
│       ├── validation/           # Zod schemas shared by forms & Express validators
│       └── business-logic/       # Money formatting (paisa <-> display), price/tax helpers
│
├── backend/                      # Centralized Node.js + Express.js + Mongoose + Socket.IO
│   ├── .env.example              # Safe placeholder-only environment template
│   ├── package.json
│   ├── tsconfig.json
│   ├── migrations/               # Versioned MongoDB schema & data migration scripts
│   ├── seed/                     # Legitimate reference data (categories, app_settings)
│   └── src/
│       ├── config/               # Env validation, MongoDB Atlas, Cloudinary/S3, payment config
│       ├── models/               # 63 Mongoose schemas & models + indexes
│       ├── middleware/           # Auth (JWT), RBAC, Ownership, Zod validate, RateLimit, Error
│       ├── validators/           # Express route-level Zod schemas
│       ├── services/             # Transactional domain services
│       ├── controllers/          # Thin HTTP request/response handlers
│       ├── routes/               # /api/v1/* Express routers
│       ├── sockets/              # Socket.IO auth, rooms, and event emitters
│       └── utils/                # Money math, OTP/crypto, logger, idempotency helpers
│
├── mobile-customer/              # Customer Mobile App (Expo + Expo Router + TypeScript)
│   ├── app/                      # File-based Expo Router routes ((auth), (tabs), modals)
│   ├── components/               # Design-system primitives + customer-specific cards
│   ├── features/                 # Feature modules (home, restaurant, cart, tracking, etc.)
│   ├── hooks/                    # TanStack Query hooks, theme/RTL, netinfo, socket hooks
│   ├── services/                 # Axios/fetch API client, token refresh, Socket.IO client
│   ├── store/                    # Zustand stores (auth/session, cart draft, theme, locale)
│   ├── types/                    # App-local view types
│   ├── constants/                # Theme bindings, route constants
│   └── assets/                   # Fonts (Inter, Noto Sans Arabic), brand logo, illustrations
│
├── mobile-rider/                 # Rider Mobile App (Expo + Expo Router + TypeScript)
│   ├── app/                      # (auth), (tabs), active-delivery/[id], pickup/[id], etc.
│   ├── components/
│   ├── features/                 # dashboard, requests, navigation, verification, earnings
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── constants/
│   └── assets/
│
├── web-restaurant/               # Restaurant Owner & Staff Dashboard (React + Vite + TS)
│   └── src/
│       ├── components/           # Shared UI primitives + dashboard widgets
│       ├── layouts/              # AuthLayout, DashboardShell (sidebar + topbar)
│       ├── pages/                # Route pages (Modules 22–34)
│       ├── features/             # Domain feature slices (orders, menu, inventory, staff)
│       ├── hooks/
│       ├── services/
│       ├── store/
│       ├── types/
│       ├── utils/
│       └── styles/               # CSS custom properties (tokens.css, themes.css, global.css)
│
└── web-admin/                    # Super Admin Dashboard (React + Vite + TS)
    └── src/
        ├── components/           # Enterprise tables, analytics cards, approval drawers
        ├── layouts/              # AuthLayout, AdminShell (collapsible sidebar + topbar)
        ├── pages/                # Route pages (Modules 41–53)
        ├── features/             # Domain feature slices (approvals, payouts, disputes, audit)
        ├── hooks/
        ├── services/
        ├── store/
        ├── types/
        ├── utils/
        └── styles/
```

---

## 2. Monorepo Workspace Rules & Metro Compatibility

1. **`shared/` Purity Rule**: `shared/` must contain **only pure TypeScript** (no `react-native`, no `react-dom`, no `fs`/`crypto` Node built-ins). This guarantees `mobile-customer`, `mobile-rider`, `web-restaurant`, `web-admin`, and `backend` can import `@zestroute/shared` seamlessly.
2. **Expo Metro Configuration**: Both `mobile-customer/metro.config.js` and `mobile-rider/metro.config.js` will include `watchFolders` pointing to `../shared` and `nodeModulesPaths` pointing to `[projectRoot/node_modules, workspaceRoot/node_modules]` so Windows npm-workspace symlinks resolve cleanly.
3. **Vite Configuration**: Both `web-restaurant/vite.config.ts` and `web-admin/vite.config.ts` will alias `@zestroute/shared` to `../shared/src` for instant HMR without manual rebuilds during development.
4. **UI-First Adapter Boundary**: During Phases 3–6 (UI implementation before Backend Phases 7–14), every screen consumes data through typed `hooks/` (e.g., `useRestaurants()`, `useOrders()`). Those hooks expose clean `{ data, isLoading, isError, refetch }` signatures matching TanStack Query so Phases 8–12 wire real API calls without rewriting UI components.
