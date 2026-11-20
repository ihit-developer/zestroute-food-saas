# 03. Navigation Architecture

All four applications enforce **route guards** based on authentication state, account status (`pending`, `approved`, `suspended`), and role/staff permissions.

---

## 1. Customer Mobile App (`mobile-customer/` — Expo Router)

```text
app/
├── _layout.tsx                       # Root Provider Stack (Theme, RTL, Query, Auth Gate)
├── index.tsx                         # Splash Screen (Module 1) -> routes to Onboarding / Home
├── onboarding.tsx                    # 3-Slide Onboarding (Skip / Next / Get Started)
│
├── (auth)/                           # Unauthenticated Stack (Module 2)
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   └── verify-otp.tsx                # Email / Phone OTP Verification
│
├── (tabs)/                           # Authenticated Main Bottom Tabs
│   ├── _layout.tsx                   # 4-5 Tabs: Home, Search/Categories, Orders, Favorites, Profile
│   ├── home.tsx                      # Module 4: Home (12 sections + address selector + bell)
│   ├── explore.tsx                   # Modules 5–6: Categories + Restaurant Discovery & Filters
│   ├── orders.tsx                    # Module 13: Active / Completed / Cancelled Tabs
│   ├── favorites.tsx                 # Module 15: Saved Restaurants, Foods, Recently Viewed
│   └── profile.tsx                   # Module 3: Profile Hub + Wallet/Loyalty/Support links
│
├── restaurant/
│   └── [id].tsx                      # Module 7: Restaurant Details, Menu Search, Offers, Reviews
├── food/
│   └── [id].tsx                      # Module 8: Food Details, Variants, Add-ons, Dynamic Price
├── cart/
│   └── index.tsx                     # Module 9: Shopping Cart, Coupon, Restaurant Switch Guard
├── checkout/
│   └── index.tsx                     # Module 11–12: Address, Instructions, Payment Method, Confirm
├── addresses/
│   ├── index.tsx                     # Module 10: Saved Addresses List
│   └── form.tsx                      # Add/Edit Address + Map Pin Picker
├── order/
│   ├── [id].tsx                      # Order Detail + Invoice Download + Cancel/Refund/Review
│   └── tracking/[id].tsx             # Module 14: Live Map, Rider Info, OTP, Timeline
├── wallet/
│   └── index.tsx                     # Module 18 & 58: Wallet Balance, Transactions, Loyalty, Membership
├── notifications/
│   └── index.tsx                     # Module 19: Notification Center (Read/Unread)
├── support/
│   ├── index.tsx                     # Module 20: Help Center, FAQ, Tickets List
│   ├── new-ticket.tsx                # Missing/Wrong/Late/Refund Complaint Form
│   └── ticket/[id].tsx               # In-App Support Chat Thread
├── settings/
│   └── index.tsx                     # Module 21: English/Urdu RTL, Dark/Light Theme, Privacy, Delete
└── advanced/                         # Module 54–60 (unlocked after core ordering)
    ├── group-order/[code].tsx        # Group Order Lobby & Shared Cart
    ├── scheduled.tsx                 # Scheduled & Recurring Orders
    └── surprise-boxes.tsx            # Food Surprise Boxes & Festival Campaigns
```

---

## 2. Delivery Rider Mobile App (`mobile-rider/` — Expo Router)

```text
app/
├── _layout.tsx                       # Root Providers + Rider Status Gate (pending/approved/suspended)
├── index.tsx                         # Splash & Session Check
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx                  # Module 35: Personal + CNIC + License + Vehicle Docs
│   └── pending-approval.tsx          # Verification Status Screen (blocks dashboard until approved)
├── (tabs)/
│   ├── _layout.tsx                   # Tabs: Dashboard, Requests, Earnings, History, Profile
│   ├── dashboard.tsx                 # Module 36: Online/Offline Toggle, Active Delivery Card, KPIs
│   ├── requests.tsx                  # Module 37: Incoming Delivery Requests (Accept / Reject)
│   ├── earnings.tsx                  # Module 40: Daily/Weekly/Monthly Earnings, Tips, Payouts
│   ├── history.tsx                   # Completed & Cancelled Deliveries
│   └── profile.tsx                   # Rider Profile, Vehicle Info, Documents, Ratings, Support
└── delivery/
    ├── [id]/pickup.tsx               # Module 38: Navigate to Restaurant, Pickup Verification
    └── [id]/dropoff.tsx              # Module 39: Navigate to Customer, Live GPS, OTP, Proof Photo
```

---

## 3. Restaurant Owner Web Dashboard (`web-restaurant/` — React Router)

```text
/login                                # Staff / Owner Login
/register                             # Module 22: Restaurant Onboarding + Docs + Bank Details
/pending-approval                     # Shown while status is pending / under_review / rejected
/                                     # Protected DashboardShell (Collapsible Sidebar + Topbar)
├── /dashboard                        # Module 23: KPIs, Daily/Monthly Charts, Top Foods
├── /orders                           # Module 29: Live Order Board (New, Preparing, Ready, History)
├── /menu/categories                  # Module 26: Restaurant Menu Categories
├── /menu/items                       # Module 27–28: Food Items, Variants, Add-ons, Availability
├── /inventory                        # Module 30: Ingredients, Recipes, Stock, Low/Expiry Alerts
├── /promotions                       # Module 32: Discounts, Combos, BOGO, Happy Hours
├── /branches                         # Module 25: Multi-branch Profiles, Hours, Coordinates
├── /staff                            # Module 31: Staff Accounts & Granular Permissions
├── /reviews                          # Module 33: Ratings & Owner Replies (No Delete)
├── /finance                          # Module 34: Gross Sales, Commission, Net Earnings, Payouts
├── /profile                          # Module 24: Restaurant Info, Hours, Delivery Radius
└── /settings                         # Account, Password, Notification Preferences, Theme/Lang
```

---

## 4. Super Admin Web Dashboard (`web-admin/` — React Router)

```text
/login                                # Admin Login (MFA/strict session)
/                                     # Protected AdminShell (Collapsible Sidebar + Topbar)
├── /dashboard                        # Module 41: Platform KPIs, Revenue/Orders/Growth Charts
├── /customers                        # Module 42: Customer Directory, Suspend/Restore, History
├── /restaurants                      # Module 43: Approved Restaurants, Commission Rates, Finance
├── /restaurants/applications         # Module 43: Pending/Under-Review Applications + Docs
├── /riders                           # Module 44: Active Riders, Performance, Payouts
├── /riders/applications              # Module 44: Pending Rider Verification + CNIC/License
├── /orders                           # Module 45: Global Order Monitor, Rider Reassignment, Disputes
├── /categories                       # Module 46: Global Platform Categories
├── /coupons                          # Module 47: Platform & Restaurant Coupons
├── /banners                          # Module 48: Promotional Banners & Scheduling
├── /commissions                      # Module 49: Platform, Restaurant & Branch Commission Rules
├── /payments                         # Module 50: Transactions, COD vs Online, Payout Reviews
├── /refunds                          # Module 51: Refund & Dispute Queue + Evidence Review
├── /analytics                        # Module 52: Revenue, Rider, Coupon, PDF/Excel Exports
├── /complaints                       # Module 51: Support Tickets & Escalations
├── /audit-logs                       # Security & Admin Action Audit Trail
└── /settings                         # Module 53: App Name, Currency, Tax, Policies, Campaigns
```
