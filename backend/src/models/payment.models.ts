import mongoose, { Schema } from 'mongoose';

// 31. payments
const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    method: { type: String, enum: ['cod', 'jazzcash', 'easypaisa', 'card', 'wallet'], required: true },
    provider: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true, collection: 'payments' }
);
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true });

// 32. payment_transactions (immutable)
const paymentTransactionSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, immutable: true },
    providerTxId: { type: String, immutable: true },
    eventType: { type: String, required: true, immutable: true },
    amountMinor: { type: Number, required: true, min: 0, immutable: true },
    status: { type: String, required: true, immutable: true },
    rawWebhookPayload: { type: Schema.Types.Mixed, immutable: true },
    verifiedAt: { type: Date, immutable: true },
  },
  { timestamps: true, collection: 'payment_transactions' }
);
paymentTransactionSchema.index({ paymentId: 1, createdAt: -1 });
paymentTransactionSchema.index({ providerTxId: 1 }, { unique: true, sparse: true });

// 33. refunds
const refundSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'processed'], default: 'requested' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
    adminNotes: { type: String },
  },
  { timestamps: true, collection: 'refunds' }
);
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ orderId: 1 });

// 34. customer_wallets
const customerWalletSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    balanceMinor: { type: Number, default: 0, min: 0, required: true },
    currency: { type: String, default: 'PKR', required: true },
  },
  { timestamps: true, collection: 'customer_wallets' }
);
customerWalletSchema.index({ customerId: 1 }, { unique: true });

// 35. wallet_transactions (immutable)
const walletTransactionSchema = new Schema(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'CustomerWallet', required: true, immutable: true },
    type: { type: String, enum: ['credit', 'debit'], required: true, immutable: true },
    source: {
      type: String,
      enum: ['refund', 'promo', 'referral', 'order_payment'],
      required: true,
      immutable: true,
    },
    amountMinor: { type: Number, required: true, min: 1, immutable: true },
    balanceAfterMinor: { type: Number, required: true, min: 0, immutable: true },
    referenceId: { type: String, immutable: true },
    idempotencyKey: { type: String, required: true, immutable: true },
  },
  { timestamps: true, collection: 'wallet_transactions' }
);
walletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });

// 36. restaurant_payouts
const restaurantPayoutSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    grossMinor: { type: Number, required: true, min: 0 },
    commissionMinor: { type: Number, required: true, min: 0 },
    refundDeductionsMinor: { type: Number, default: 0, min: 0 },
    netMinor: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
    paidAt: { type: Date },
    referenceNo: { type: String },
  },
  { timestamps: true, collection: 'restaurant_payouts' }
);
restaurantPayoutSchema.index({ restaurantId: 1, status: 1, periodEnd: -1 });

// 37. rider_payouts
const riderPayoutSchema = new Schema(
  {
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    deliveryEarningsMinor: { type: Number, required: true, min: 0 },
    tipsMinor: { type: Number, default: 0, min: 0 },
    bonusesMinor: { type: Number, default: 0, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
    paidAt: { type: Date },
  },
  { timestamps: true, collection: 'rider_payouts' }
);
riderPayoutSchema.index({ riderId: 1, status: 1, periodEnd: -1 });

export const PaymentModel = mongoose.model('Payment', paymentSchema);
export const PaymentTransactionModel = mongoose.model('PaymentTransaction', paymentTransactionSchema);
export const RefundModel = mongoose.model('Refund', refundSchema);
export const CustomerWalletModel = mongoose.model('CustomerWallet', customerWalletSchema);
export const WalletTransactionModel = mongoose.model('WalletTransaction', walletTransactionSchema);
export const RestaurantPayoutModel = mongoose.model('RestaurantPayout', restaurantPayoutSchema);
export const RiderPayoutModel = mongoose.model('RiderPayout', riderPayoutSchema);
