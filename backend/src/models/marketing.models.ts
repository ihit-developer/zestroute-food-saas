import mongoose, { Schema } from 'mongoose';

// 44. coupons
const couponSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    scope: { type: String, enum: ['global', 'restaurant', 'user'], default: 'global' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    discountType: { type: String, enum: ['percent', 'fixed', 'free_delivery'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderMinor: { type: Number, default: 0, min: 0 },
    maxDiscountMinor: { type: Number, min: 0 },
    usageLimit: { type: Number, min: 1 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'coupons' }
);
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, expiresAt: 1 });

// 45. coupon_usage
const couponUsageSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    discountMinor: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: 'coupon_usage' }
);
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ orderId: 1 }, { unique: true });

// 46. promotional_banners
const promotionalBannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    destinationType: { type: String, enum: ['restaurant', 'category', 'url', 'none'], default: 'none' },
    destinationId: { type: String },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'promotional_banners' }
);
promotionalBannerSchema.index({ isActive: 1, sortOrder: 1, startsAt: 1, endsAt: 1 });

// 47. loyalty_accounts
const loyaltyAccountSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    pointsBalance: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ['bronze', 'silver', 'gold'], default: 'bronze' },
  },
  { timestamps: true, collection: 'loyalty_accounts' }
);
loyaltyAccountSchema.index({ customerId: 1 }, { unique: true });

// 48. loyalty_transactions
const loyaltyTransactionSchema = new Schema(
  {
    loyaltyAccountId: { type: Schema.Types.ObjectId, ref: 'LoyaltyAccount', required: true },
    type: { type: String, enum: ['earn', 'redeem', 'expire'], required: true },
    points: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    description: { type: String },
  },
  { timestamps: true, collection: 'loyalty_transactions' }
);
loyaltyTransactionSchema.index({ loyaltyAccountId: 1, createdAt: -1 });

// 49. referral_records
const referralRecordSchema = new Schema(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['pending', 'rewarded'], default: 'pending' },
    rewardMinor: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'referral_records' }
);
referralRecordSchema.index({ referredUserId: 1 }, { unique: true });
referralRecordSchema.index({ referrerId: 1 });

// 50. membership_plans
const membershipPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    priceMinor: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    freeDeliveryMinOrderMinor: { type: Number, default: 0, min: 0 },
    discountBps: { type: Number, default: 0, min: 0, max: 5000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'membership_plans' }
);
membershipPlanSchema.index({ isActive: 1 });

export const CouponModel = mongoose.model('Coupon', couponSchema);
export const CouponUsageModel = mongoose.model('CouponUsage', couponUsageSchema);
export const PromotionalBannerModel = mongoose.model('PromotionalBanner', promotionalBannerSchema);
export const LoyaltyAccountModel = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
export const LoyaltyTransactionModel = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
export const ReferralRecordModel = mongoose.model('ReferralRecord', referralRecordSchema);
export const MembershipPlanModel = mongoose.model('MembershipPlan', membershipPlanSchema);
