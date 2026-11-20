# 06. Reusable Component & UI/UX Strategy

## 1. Brand Identity & Design System Contract (Prepared for Phase 2)

- **Brand Identity**: **ZestRoute** — communicating **Trust, Freshness, Convenience, Speed, Quality, Professionalism**.
- **Color Palette (Exact Section 5.2 Tokens — centralized in `@zestroute/shared`)**:
  - Primary Orange: `#F47B20` | Secondary Deep Orange: `#D95F16` | Accent Warm Yellow: `#FFC857`
  - Light Surface: Background `#FFF9F2` | Card `#FFFFFF` | Primary Text `#292522` | Secondary Text `#81776E` | Border `#F0E7DE`
  - Dark Surface (derived harmoniously in Phase 2): Warm Espresso `#171412` | Elevated Card `#221D1A` | Text `#FAF5F0` | Secondary `#B6ABA1` | Border `#362E28`
  - Semantic Statuses: Success `#269B68` | Warning `#E5A13B` | Error `#D9534F` | Info `#5187A8`
- **Typography**:
  - English: **Inter** (400 Regular, 500 Medium, 600 SemiBold, 700 Bold)
  - Urdu (RTL): **Noto Sans Arabic** (loaded dynamically when locale === `'ur'`)
  - Scale: Display / Main Heading, Section Heading, Card Title, Body, Supporting Description, Label, Button, Navigation, Price (tabular numerals).

---

## 2. Complete Reusable Component Catalog (Section 5.4)

All 27+ required primitives will be specified in Phase 2 and implemented identically in Mobile (`mobile-customer`, `mobile-rider`) and Web (`web-restaurant`, `web-admin`):

1. **Actions**: `PrimaryButton`, `SecondaryButton`, `IconButton`
2. **Forms & Inputs**: `TextField`, `SearchBar` (debounced), `Dropdown` / `Select`, `DatePicker`, `ImageUploader`
3. **Domain Cards**: `FoodCard`, `RestaurantCard`, `CategoryCard`, `ProductDetailCard`
4. **Badges**: `DiscountBadge`, `StatusBadge` (mapped to the 12 order statuses + approval statuses)
5. **Navigation**: `BottomNav` (mobile), `Sidebar` (collapsible web), `TopNav` (web + mobile header)
6. **Overlays & Disclosure**: `Modal`, `ConfirmationDialog`, `BottomSheet`, `Tabs`
7. **Data Display**: `DataTable` (sortable, responsive), `Pagination`
8. **Feedback & Resilience (Section 16)**: `EmptyState`, `LoadingSkeleton`, `ToastNotification`, `ErrorState` (with Retry action)

---

## 3. State Management & Data Fetching Strategy

| State Category | Tool | Examples |
|---|---|---|
| **Server State** | `@tanstack/react-query` | Restaurants, menus, cart sync, orders, rider requests, analytics, pagination |
| **Client / UI State** | `zustand` | Auth session metadata, active delivery address, theme (`light`/`dark`), locale (`en`/`ur`), sidebar collapsed state |
| **Form State** | `react-hook-form` + `zod` | Login, registration, checkout, food creation, restaurant onboarding, support tickets |
| **Offline & Connectivity** | `@react-native-community/netinfo` + Banner | Global offline indicator + disabled checkout/mutations when offline + retry queue |

---

## 4. Mandatory Screen-State & RTL Rules

1. **Four-State Rule**: Every data-driven screen implements `LoadingSkeleton`, `ErrorState` (with Retry), `EmptyState` (with CTA), and `Content` state.
2. **RTL & Bilingual Rule**: Use logical CSS (`margin-inline-start`, `padding-inline-end`) on Web and React Native `start`/`end` (`I18nManager` / directional flex) on Mobile so switching English ↔ Urdu flips layouts cleanly.
3. **Accessibility**: Minimum `44x44` touch targets on mobile, WCAG AA contrast on `#FFF9F2` and `#FFFFFF`, and clear focus rings on web.
