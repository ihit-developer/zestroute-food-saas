import mongoose, { Schema } from 'mongoose';

// 58. app_settings
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, default: 'platform_config' },
    appName: { type: String, default: 'ZestRoute' },
    defaultCurrency: { type: String, default: 'PKR' },
    taxBps: { type: Number, default: 0, min: 0, max: 3000 },
    defaultCommissionBps: { type: Number, default: 1500, min: 0, max: 5000 },
    baseDeliveryFeeMinor: { type: Number, default: 12000, min: 0 },
    minOrderMinor: { type: Number, default: 30000, min: 0 },
    cancellationPolicy: { type: String, default: 'Free cancellation before restaurant confirmation.' },
    refundPolicy: { type: String, default: 'Verified refunds credited to wallet or source method.' },
    festivalMode: { type: String, enum: ['none', 'ramadan', 'eid', 'festival'], default: 'none' },
    supportEmail: { type: String, default: 'support@zestroute.app' },
  },
  { timestamps: true, collection: 'app_settings' }
);
appSettingSchema.index({ key: 1 }, { unique: true });

// 59. audit_logs (immutable)
const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, immutable: true },
    actorRole: { type: String, required: true, immutable: true },
    action: { type: String, required: true, immutable: true },
    resourceType: { type: String, required: true, immutable: true },
    resourceId: { type: String, required: true, immutable: true },
    before: { type: Schema.Types.Mixed, immutable: true },
    after: { type: Schema.Types.Mixed, immutable: true },
    ipAddress: { type: String, immutable: true },
    userAgent: { type: String, immutable: true },
  },
  { timestamps: true, collection: 'audit_logs' }
);
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

// 60. system_logs
const systemLogSchema = new Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], required: true },
    service: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'system_logs' }
);
systemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 }); // 90-day TTL
systemLogSchema.index({ level: 1, createdAt: -1 });

// 61. scheduled_orders
const scheduledOrderSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true },
    scheduleType: { type: String, enum: ['once', 'recurring'], default: 'once' },
    cronOrDays: { type: String },
    scheduledAt: { type: Date, required: true },
    itemsSnapshot: [{ type: Schema.Types.Mixed }],
    status: { type: String, enum: ['scheduled', 'triggered', 'paused', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true, collection: 'scheduled_orders' }
);
scheduledOrderSchema.index({ status: 1, scheduledAt: 1 });

// 62. group_orders
const groupOrderSchema = new Schema(
  {
    hostCustomerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true },
    inviteCode: { type: String, required: true },
    status: { type: String, enum: ['open', 'locked', 'ordered', 'cancelled'], default: 'open' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'group_orders' }
);
groupOrderSchema.index({ inviteCode: 1 }, { unique: true });
groupOrderSchema.index({ hostCustomerId: 1, status: 1 });

// 63. group_order_members
const groupOrderMemberSchema = new Schema(
  {
    groupOrderId: { type: Schema.Types.ObjectId, ref: 'GroupOrder', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    items: [{ type: Schema.Types.Mixed }],
    subtotalMinor: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true, collection: 'group_order_members' }
);
groupOrderMemberSchema.index({ groupOrderId: 1, customerId: 1 }, { unique: true });

export const AppSettingModel = mongoose.model('AppSetting', appSettingSchema);
export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
export const SystemLogModel = mongoose.model('SystemLog', systemLogSchema);
export const ScheduledOrderModel = mongoose.model('ScheduledOrder', scheduledOrderSchema);
export const GroupOrderModel = mongoose.model('GroupOrder', groupOrderSchema);
export const GroupOrderMemberModel = mongoose.model('GroupOrderMember', groupOrderMemberSchema);
