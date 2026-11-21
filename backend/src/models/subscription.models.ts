import mongoose, { Schema } from 'mongoose';

// 63. subscription_packages
const subscriptionPackageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    monthlyPriceMinor: { type: Number, required: true, min: 0 },
    yearlyPriceMinor: { type: Number, required: true, min: 0 },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    trialEligible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'subscription_packages' }
);
subscriptionPackageSchema.index({ slug: 1 }, { unique: true });
subscriptionPackageSchema.index({ isActive: 1, sortOrder: 1 });

// 64. vendor_subscriptions
const vendorSubscriptionSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPackage' },
    billingCycle: {
      type: String,
      enum: ['trial', 'monthly', 'yearly'],
      default: 'trial',
      required: true,
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'pending_payment', 'expired', 'suspended'],
      default: 'trial',
      required: true,
    },
    trialStartsAt: { type: Date },
    trialEndsAt: { type: Date },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    autoRenew: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'vendor_subscriptions' }
);
vendorSubscriptionSchema.index({ restaurantId: 1 }, { unique: true });
vendorSubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

// 65. subscription_payments
const subscriptionPaymentSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'VendorSubscription', required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPackage', required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', required: true },
    paymentMethod: {
      type: String,
      enum: ['jazzcash', 'easypaisa', 'bank_transfer', 'card'],
      required: true,
    },
    senderAccount: { type: String, required: true, trim: true },
    transactionRef: { type: String, required: true, trim: true },
    proofImageUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    rejectionReason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
    reviewedAt: { type: Date },
  },
  { timestamps: true, collection: 'subscription_payments' }
);
subscriptionPaymentSchema.index({ restaurantId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ transactionRef: 1 }, { unique: true });

export const SubscriptionPackageModel = mongoose.model(
  'SubscriptionPackage',
  subscriptionPackageSchema
);
export const VendorSubscriptionModel = mongoose.model(
  'VendorSubscription',
  vendorSubscriptionSchema
);
export const SubscriptionPaymentModel = mongoose.model(
  'SubscriptionPayment',
  subscriptionPaymentSchema
);
