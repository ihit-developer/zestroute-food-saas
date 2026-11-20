# 04. Database Architecture (MongoDB Atlas + Mongoose)

## 1. Database Governance Rules

- **Primary Database**: **MongoDB Atlas** (Replica Set enabled for multi-document ACID transactions). Zero SQL/Supabase/Firebase databases permitted.
- **ODM**: Mongoose with strict schema validation (`strict: 'throw'` or `'filter'`, `timestamps: true` on every collection).
- **Financial Precision**: All money fields store **integer minor units** (`paisa`, e.g., `Rs. 500.00 = 50000`) plus an explicit `currency` code (`'PKR'` default). Commission rates use basis points (`bps`, e.g., `1500 = 15.00%`).
- **Immutability & Snapshots**: Order items, customizations, commission rates, and financial ledgers store immutable snapshots so later menu/commission edits never alter historical records.
- **Unbounded Growth Rule**: Growing histories (`order_status_history`, `rider_locations`, `wallet_transactions`, `audit_logs`, `support_messages`) live in dedicated collections rather than unbounded embedded arrays.
- **Migrations**: All schema/index/data evolutions use versioned migration scripts in `backend/migrations/`.

---

## 2. Complete 63-Collection Inventory & Schema Design

### A. User Collections (1–6)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 1 | `profiles` | Core user identity (`fullName`, `email`, `phone`, `passwordHash`, `avatarUrl`, `accountStatus`, `emailVerifiedAt`, `phoneVerifiedAt`) | Unique sparse on `email`, unique sparse on `phone`; `accountStatus` enum (`active`, `suspended`, `deleted`) |
| 2 | `user_roles` | `userId -> profiles` + `role` (`customer`, `restaurant_owner`, `restaurant_staff`, `rider`, `super_admin`) + `assignedBy` | Unique compound `(userId, role)` |
| 3 | `addresses` | `userId -> profiles`, `label` (`home`, `office`, `other`), `location` GeoJSON Point `[lng, lat]`, `isDefault` | `2dsphere` on `location`; index `(userId, isDefault)` |
| 4 | `user_preferences` | `userId -> profiles` (1:1), `language` (`en`, `ur`), `theme` (`light`, `dark`, `system`), notification toggles, dietary tags | Unique on `userId` |
| 5 | `user_devices` | `userId -> profiles`, `expoPushToken`, `platform` (`ios`, `android`, `web`), `lastSeenAt` | Unique `(userId, expoPushToken)` |
| 6 | `user_sessions` | `userId -> profiles`, `refreshTokenHash`, `deviceId`, `ipAddress`, `userAgent`, `expiresAt`, `revokedAt` | TTL index on `expiresAt`; index `(userId, revokedAt)` |

### B. Restaurant Collections (7–12)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 7 | `restaurants` | `ownerId -> profiles`, `name`, `slug`, `cuisineTypes[]`, `logoUrl`, `coverUrl`, `status` (`pending`, `under_review`, `approved`, `rejected`, `suspended`), `commissionBps`, `ratingAvg`, `ratingCount` | Unique `slug`; text index `(name, cuisineTypes)`; index `(status, ratingAvg)` |
| 8 | `restaurant_documents` | `restaurantId -> restaurants`, `docType`, `fileUrl`, `status` (`pending`, `verified`, `rejected`), `reviewedBy -> profiles` | Index `(restaurantId, status)` |
| 9 | `restaurant_branches` | `restaurantId -> restaurants`, `name`, `address`, `city`, `area`, `location` GeoJSON Point, `deliveryRadiusMeters`, `minOrderMinor`, `deliveryFeeMinor`, `isTemporarilyClosed`, `isActive` | `2dsphere` on `location`; index `(restaurantId, isActive)` |
| 10 | `restaurant_hours` | `branchId -> restaurant_branches`, `dayOfWeek` (0–6), `openTime`, `closeTime`, `isClosed`, `holidayDate` | Compound `(branchId, dayOfWeek)` |
| 11 | `restaurant_staff` | `restaurantId -> restaurants`, `branchId -> restaurant_branches` (optional = all branches), `userId -> profiles`, `title`, `isActive` | Unique `(restaurantId, userId)` |
| 12 | `restaurant_staff_permissions` | `staffId -> restaurant_staff`, `permissions[]` (`orders`, `menu`, `inventory`, `reports`, `branches`) | Unique on `staffId` |

### C. Food Collections (13–22)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 13 | `categories` | Global admin categories: `name`, `nameUr`, `slug`, `imageUrl`, `sortOrder`, `isActive` | Unique `slug`; index `(isActive, sortOrder)` |
| 14 | `restaurant_categories` | `restaurantId -> restaurants`, `name`, `imageUrl`, `sortOrder`, `isActive` | Index `(restaurantId, isActive, sortOrder)` |
| 15 | `food_items` | `restaurantId -> restaurants`, `branchId -> restaurant_branches` (optional), `globalCategoryId -> categories`, `restaurantCategoryId -> restaurant_categories`, `name`, `description`, `ingredients[]`, `regularPriceMinor`, `discountPriceMinor`, `prepTimeMins`, `isAvailable`, `isFeatured`, `orderCount`, `ratingAvg` | Text index `(name, description, ingredients)`; compound `(restaurantId, isAvailable, restaurantCategoryId)`; `(globalCategoryId, isAvailable)` |
| 16 | `food_images` | `foodItemId -> food_items`, `url`, `isPrimary`, `sortOrder` | Index `(foodItemId, sortOrder)` |
| 17 | `food_variants` | `foodItemId -> food_items`, `groupName` (e.g., Size), `name` (Small/Medium/Large), `priceDeltaMinor`, `isDefault`, `isAvailable` | Index `(foodItemId, isAvailable)` |
| 18 | `food_addons` | `restaurantId -> restaurants`, `name`, `priceMinor`, `isAvailable` (reusable restaurant add-ons) | Index `(restaurantId, isAvailable)` |
| 19 | `food_item_addons` | `foodItemId -> food_items`, `addonGroupName`, `addonId -> food_addons`, `isRequired`, `minSelect`, `maxSelect` | Unique `(foodItemId, addonId)` |
| 20 | `ingredients` | `restaurantId -> restaurants`, `branchId -> restaurant_branches`, `name`, `unit` (`g`, `kg`, `ml`, `pcs`), `purchasePriceMinor`, `supplierName`, `lowStockThreshold` | Index `(restaurantId, branchId, name)` |
| 21 | `food_recipes` | `foodItemId -> food_items`, `variantId -> food_variants` (optional), `ingredientId -> ingredients`, `quantityRequired` | Unique `(foodItemId, variantId, ingredientId)` |
| 22 | `food_stock` | `ingredientId -> ingredients` (or `foodItemId -> food_items` for packaged items), `branchId -> restaurant_branches`, `quantity` (`>= 0`), `expiryDate`, `lastRestockedAt` | Unique `(ingredientId, branchId)`; check `quantity >= 0` |

### D. Order Collections (23–30)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 23 | `carts` | `customerId -> profiles`, `restaurantId -> restaurants`, `branchId -> restaurant_branches`, `couponCode`, `subtotalMinor`, `discountMinor`, `deliveryFeeMinor`, `taxMinor`, `totalMinor`, `currency` | Unique on `customerId` (enforces 1 active cart per customer & 1 restaurant per cart) |
| 24 | `cart_items` | `cartId -> carts`, `foodItemId -> food_items`, `variantId -> food_variants`, `quantity`, `specialInstructions`, `unitPriceMinor`, `lineTotalMinor` | Index `(cartId, foodItemId)` |
| 25 | `cart_item_customizations` | `cartItemId -> cart_items`, `addonId -> food_addons`, `quantity`, `priceMinor` | Index `cartItemId` |
| 26 | `orders` | `orderNumber` (unique), `idempotencyKey`, `customerId -> profiles`, `restaurantId -> restaurants`, `branchId -> restaurant_branches`, `deliveryAddressSnapshot` (embedded), `status` (12-state enum), `paymentMethod`, `paymentStatus`, `subtotalMinor`, `discountMinor`, `deliveryFeeMinor`, `taxMinor`, `tipMinor`, `totalMinor`, `commissionBps`, `commissionMinor`, `restaurantNetMinor`, `currency`, `couponId -> coupons`, `deliveryOtpHash`, `scheduledFor` | Unique `orderNumber`; unique `(customerId, idempotencyKey)`; indexes `(customerId, createdAt)`, `(restaurantId, status, createdAt)`, `(branchId, status)` |
| 27 | `order_items` | `orderId -> orders`, `foodItemId -> food_items`, `nameSnapshot`, `variantNameSnapshot`, `quantity`, `unitPriceMinor`, `customizationsTotalMinor`, `lineTotalMinor`, `specialInstructions` | Index `orderId` |
| 28 | `order_item_customizations` | `orderItemId -> order_items`, `addonId -> food_addons`, `nameSnapshot`, `priceMinor`, `quantity` | Index `orderItemId` |
| 29 | `order_status_history` | `orderId -> orders`, `fromStatus`, `toStatus`, `changedBy -> profiles`, `role`, `note`, `timestamp` | Index `(orderId, timestamp)` |
| 30 | `order_cancellations` | `orderId -> orders`, `cancelledBy -> profiles`, `role`, `reason`, `policyApplied`, `refundEligible` | Unique `orderId` |

### E. Payment & Financial Collections (31–37)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 31 | `payments` | `orderId -> orders`, `customerId -> profiles`, `method` (`cod`, `jazzcash`, `easypaisa`, `card`, `wallet`), `provider`, `amountMinor`, `currency`, `status` (`pending`, `paid`, `failed`, `refunded`), `idempotencyKey` | Unique `orderId`; unique `idempotencyKey` |
| 32 | `payment_transactions` | `paymentId -> payments`, `providerTxId`, `eventType`, `amountMinor`, `status`, `rawWebhookPayload` (redacted), `verifiedAt` (Immutable) | Unique sparse `(provider, providerTxId)`; index `paymentId` |
| 33 | `refunds` | `orderId -> orders`, `paymentId -> payments`, `customerId -> profiles`, `amountMinor`, `reason`, `evidenceUrls[]`, `status` (`requested`, `approved`, `rejected`, `processed`), `reviewedBy -> profiles`, `adminNotes` | Index `(status, createdAt)`, `orderId` |
| 34 | `customer_wallets` | `customerId -> profiles`, `balanceMinor` (`>= 0`), `currency` | Unique `customerId` |
| 35 | `wallet_transactions` | `walletId -> customer_wallets`, `type` (`credit`, `debit`), `source` (`refund`, `promo`, `referral`, `order_payment`), `amountMinor`, `balanceAfterMinor`, `referenceId`, `idempotencyKey` (Immutable) | Unique `idempotencyKey`; index `(walletId, createdAt)` |
| 36 | `restaurant_payouts` | `restaurantId -> restaurants`, `periodStart`, `periodEnd`, `grossMinor`, `commissionMinor`, `refundDeductionsMinor`, `netMinor`, `status`, `paidAt`, `referenceNo` | Index `(restaurantId, status, periodEnd)` |
| 37 | `rider_payouts` | `riderId -> riders`, `periodStart`, `periodEnd`, `deliveryEarningsMinor`, `tipsMinor`, `bonusesMinor`, `totalMinor`, `status`, `paidAt` | Index `(riderId, status, periodEnd)` |

### F. Delivery & Rider Collections (38–43)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 38 | `riders` | `userId -> profiles`, `vehicleType`, `vehicleNumber`, `cnicMasked`, `status` (`pending`, `approved`, `rejected`, `suspended`), `isOnline`, `currentLocation` GeoJSON Point, `ratingAvg`, `completedCount` | Unique `userId`; `2dsphere` on `currentLocation`; index `(status, isOnline)` |
| 39 | `rider_documents` | `riderId -> riders`, `docType` (`cnic_front`, `cnic_back`, `license`, `vehicle_reg`), `fileUrl`, `status`, `reviewedBy -> profiles` | Index `(riderId, docType)` |
| 40 | `deliveries` | `orderId -> orders`, `riderId -> riders`, `status`, `pickupAddressSnapshot`, `dropoffAddressSnapshot`, `distanceMeters`, `riderEarningMinor`, `tipMinor`, `proofPhotoUrl`, `otpVerifiedAt`, `deliveredAt` | Unique `orderId`; index `(riderId, status, createdAt)` |
| 41 | `delivery_assignments` | `deliveryId -> deliveries`, `riderId -> riders`, `status` (`offered`, `accepted`, `rejected`, `expired`), `offeredAt`, `respondedAt`, `expiresAt` | Unique partial index on `(deliveryId)` where `status === 'accepted'` (prevents double-accept) |
| 42 | `rider_locations` | `riderId -> riders`, `deliveryId -> deliveries`, `location` GeoJSON Point, `heading`, `speed`, `recordedAt` | TTL index (e.g., 30 days) on `recordedAt`; index `(deliveryId, recordedAt)` |
| 43 | `delivery_status_history` | `deliveryId -> deliveries`, `status`, `changedBy -> profiles`, `timestamp` | Index `(deliveryId, timestamp)` |

### G. Marketing & Loyalty Collections (44–50)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 44 | `coupons` | `code` (uppercase), `scope` (`global`, `restaurant`, `user`), `restaurantId -> restaurants`, `targetUserId -> profiles`, `discountType` (`percent`, `fixed`, `free_delivery`), `value`, `minOrderMinor`, `maxDiscountMinor`, `usageLimit`, `perUserLimit`, `usedCount`, `startsAt`, `expiresAt`, `isActive` | Unique `code`; index `(isActive, expiresAt)` |
| 45 | `coupon_usage` | `couponId -> coupons`, `userId -> profiles`, `orderId -> orders`, `discountMinor`, `usedAt` | Index `(couponId, userId)`, unique `orderId` |
| 46 | `promotional_banners` | `title`, `description`, `imageUrl`, `destinationType`, `destinationId`, `startsAt`, `endsAt`, `sortOrder`, `isActive` | Index `(isActive, sortOrder, startsAt, endsAt)` |
| 47 | `loyalty_accounts` | `customerId -> profiles`, `pointsBalance` (`>= 0`), `lifetimePoints`, `tier` | Unique `customerId` |
| 48 | `loyalty_transactions` | `loyaltyAccountId -> loyalty_accounts`, `type` (`earn`, `redeem`, `expire`), `points`, `orderId -> orders`, `description` | Index `(loyaltyAccountId, createdAt)` |
| 49 | `referral_records` | `referrerId -> profiles`, `referredUserId -> profiles`, `code`, `status` (`pending`, `rewarded`), `rewardMinor` | Unique `referredUserId`; index `referrerId` |
| 50 | `membership_plans` | `name`, `priceMinor`, `durationDays`, `freeDeliveryMinOrderMinor`, `discountBps`, `isActive` | Index `isActive` |

### H. Customer Engagement & Support Collections (51–57)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 51 | `favorites` | `customerId -> profiles`, `targetType` (`restaurant`, `food_item`), `targetId` | Unique `(customerId, targetType, targetId)` |
| 52 | `reviews` | `orderId -> orders`, `customerId -> profiles`, `restaurantId -> restaurants`, `riderId -> riders`, `restaurantRating`, `foodRating`, `deliveryRating`, `comment`, `ownerReply`, `ownerRepliedAt` | Unique `(orderId, customerId)`; index `(restaurantId, createdAt)` |
| 53 | `review_images` | `reviewId -> reviews`, `url` | Index `reviewId` |
| 54 | `notifications` | `userId -> profiles`, `type`, `title`, `body`, `data` (entity refs), `isRead`, `readAt` | Index `(userId, isRead, createdAt)` |
| 55 | `support_tickets` | `ticketNumber`, `userId -> profiles`, `orderId -> orders`, `category` (`missing_food`, `wrong_order`, `late_delivery`, `refund`, `other`), `status`, `priority`, `assignedAdminId -> profiles` | Unique `ticketNumber`; index `(userId, status, createdAt)` |
| 56 | `support_messages` | `ticketId -> support_tickets`, `senderId -> profiles`, `senderRole`, `message`, `attachmentUrls[]` | Index `(ticketId, createdAt)` |
| 57 | `complaints` | `userId -> profiles`, `orderId -> orders`, `againstRole` (`restaurant`, `rider`), `againstId`, `type`, `description`, `evidenceUrls[]`, `status`, `resolutionNotes` | Index `(status, createdAt)` |

### I. System & Advanced Collections (58–63)
| # | Collection | Key References / Embedding | Key Indexes & Rules |
|---|---|---|---|
| 58 | `app_settings` | Singleton/versioned config: `appName`, `defaultCurrency`, `taxBps`, `defaultCommissionBps`, `baseDeliveryFeeMinor`, `minOrderMinor`, `cancellationPolicy`, `refundPolicy`, `festivalMode` | Unique `key` (`'platform_config'`) |
| 59 | `audit_logs` | `actorId -> profiles`, `actorRole`, `action`, `resourceType`, `resourceId`, `before`, `after`, `ipAddress`, `userAgent` (Immutable) | Index `(resourceType, resourceId, createdAt)`, `(actorId, createdAt)` |
| 60 | `system_logs` | `level` (`info`, `warn`, `error`), `service`, `message`, `meta`, `createdAt` | TTL index (90 days) on `createdAt`; index `(level, createdAt)` |
| 61 | `scheduled_orders` | `customerId -> profiles`, `restaurantId -> restaurants`, `branchId -> restaurant_branches`, `scheduleType` (`once`, `recurring`), `cronOrDays`, `scheduledAt`, `itemsSnapshot[]`, `status` | Index `(status, scheduledAt)` |
| 62 | `group_orders` | `hostCustomerId -> profiles`, `restaurantId -> restaurants`, `branchId -> restaurant_branches`, `inviteCode`, `status` (`open`, `locked`, `ordered`, `cancelled`), `expiresAt` | Unique `inviteCode`; index `(hostCustomerId, status)` |
| 63 | `group_order_members` | `groupOrderId -> group_orders`, `customerId -> profiles`, `items[]`, `subtotalMinor`, `paymentStatus` | Unique `(groupOrderId, customerId)` |

---

## 3. Multi-Document ACID Transaction Boundaries

MongoDB Atlas Replica Set `session.withTransaction(...)` is **mandatory** for:
1. **Order Placement**: Create `orders` + `order_items` + `order_item_customizations` + `order_status_history` + `payments` + decrement `food_stock` (`quantity >= required`) + increment `coupons.usedCount` + record `coupon_usage` + debit `customer_wallets` (if wallet used) + clear `carts`/`cart_items`.
2. **Delivery Acceptance**: Atomically claim `delivery_assignments` (`status: 'offered' -> 'accepted'`) + assign `deliveries.riderId` + update `orders.status -> 'rider_assigned'` + write `order_status_history` & `delivery_status_history`.
3. **Delivery Completion**: Verify OTP + update `deliveries.status -> 'delivered'` + update `orders.status -> 'delivered'` + award `loyalty_transactions` + write status histories.
4. **Refund Processing**: Update `refunds.status -> 'processed'` + credit `customer_wallets` + write immutable `wallet_transactions` + update `payments.status` + write `audit_logs`.
