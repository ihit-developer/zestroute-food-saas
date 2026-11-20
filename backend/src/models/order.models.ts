import mongoose, { Schema } from 'mongoose';

// 23. carts
const cartSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true },
    couponCode: { type: String, trim: true, uppercase: true },
    subtotalMinor: { type: Number, default: 0, min: 0 },
    discountMinor: { type: Number, default: 0, min: 0 },
    deliveryFeeMinor: { type: Number, default: 0, min: 0 },
    taxMinor: { type: Number, default: 0, min: 0 },
    totalMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'PKR', required: true },
  },
  { timestamps: true, collection: 'carts' }
);
cartSchema.index({ customerId: 1 }, { unique: true });

// 24. cart_items
const cartItemSchema = new Schema(
  {
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', required: true },
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'FoodVariant' },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
    specialInstructions: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, collection: 'cart_items' }
);
cartItemSchema.index({ cartId: 1, foodItemId: 1 });

// 25. cart_item_customizations
const cartItemCustomizationSchema = new Schema(
  {
    cartItemId: { type: Schema.Types.ObjectId, ref: 'CartItem', required: true },
    addonId: { type: Schema.Types.ObjectId, ref: 'FoodAddon', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    priceMinor: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: 'cart_item_customizations' }
);
cartItemCustomizationSchema.index({ cartItemId: 1 });

// 26. orders
const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, immutable: true },
    idempotencyKey: { type: String, required: true, immutable: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, immutable: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, immutable: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true, immutable: true },
    deliveryAddressSnapshot: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, required: true },
      street: { type: String, required: true },
      houseNumber: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      instructions: { type: String },
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'rider_assigned',
        'picked_up',
        'on_the_way',
        'delivered',
        'rejected',
        'cancelled',
        'refund_pending',
        'refunded',
      ],
      default: 'pending',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'jazzcash', 'easypaisa', 'card', 'wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      required: true,
    },
    subtotalMinor: { type: Number, required: true, min: 0, immutable: true },
    discountMinor: { type: Number, default: 0, min: 0, immutable: true },
    deliveryFeeMinor: { type: Number, default: 0, min: 0, immutable: true },
    taxMinor: { type: Number, default: 0, min: 0, immutable: true },
    tipMinor: { type: Number, default: 0, min: 0, immutable: true },
    totalMinor: { type: Number, required: true, min: 0, immutable: true },
    commissionBps: { type: Number, required: true, min: 0, immutable: true },
    commissionMinor: { type: Number, required: true, min: 0, immutable: true },
    restaurantNetMinor: { type: Number, required: true, min: 0, immutable: true },
    currency: { type: String, default: 'PKR', required: true, immutable: true },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    deliveryOtp: { type: String },
    deliveryOtpHash: { type: String, select: false },
    scheduledFor: { type: Date },
  },
  { timestamps: true, collection: 'orders' }
);
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ branchId: 1, status: 1 });

// 27. order_items
const orderItemSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, immutable: true },
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true, immutable: true },
    nameSnapshot: { type: String, required: true, immutable: true },
    variantNameSnapshot: { type: String, immutable: true },
    quantity: { type: Number, required: true, min: 1, immutable: true },
    unitPriceMinor: { type: Number, required: true, min: 0, immutable: true },
    customizationsTotalMinor: { type: Number, default: 0, min: 0, immutable: true },
    lineTotalMinor: { type: Number, required: true, min: 0, immutable: true },
    specialInstructions: { type: String, immutable: true },
  },
  { timestamps: true, collection: 'order_items' }
);
orderItemSchema.index({ orderId: 1 });

// 28. order_item_customizations
const orderItemCustomizationSchema = new Schema(
  {
    orderItemId: { type: Schema.Types.ObjectId, ref: 'OrderItem', required: true, immutable: true },
    addonId: { type: Schema.Types.ObjectId, ref: 'FoodAddon', required: true, immutable: true },
    nameSnapshot: { type: String, required: true, immutable: true },
    priceMinor: { type: Number, required: true, min: 0, immutable: true },
    quantity: { type: Number, default: 1, min: 1, immutable: true },
  },
  { timestamps: true, collection: 'order_item_customizations' }
);
orderItemCustomizationSchema.index({ orderItemId: 1 });

// 29. order_status_history
const orderStatusHistorySchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, immutable: true },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    role: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true, collection: 'order_status_history' }
);
orderStatusHistorySchema.index({ orderId: 1, createdAt: 1 });

// 30. order_cancellations
const orderCancellationSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    role: { type: String, required: true },
    reason: { type: String, required: true },
    policyApplied: { type: String },
    refundEligible: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'order_cancellations' }
);
orderCancellationSchema.index({ orderId: 1 }, { unique: true });

export const CartModel = mongoose.model('Cart', cartSchema);
export const CartItemModel = mongoose.model('CartItem', cartItemSchema);
export const CartItemCustomizationModel = mongoose.model('CartItemCustomization', cartItemCustomizationSchema);
export const OrderModel = mongoose.model('Order', orderSchema);
export const OrderItemModel = mongoose.model('OrderItem', orderItemSchema);
export const OrderItemCustomizationModel = mongoose.model('OrderItemCustomization', orderItemCustomizationSchema);
export const OrderStatusHistoryModel = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
export const OrderCancellationModel = mongoose.model('OrderCancellation', orderCancellationSchema);
