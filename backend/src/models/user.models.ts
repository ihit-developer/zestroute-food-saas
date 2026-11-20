import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// 1. profiles
const profileSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      required: true,
    },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    googleId: { type: String, sparse: true },
  },
  { timestamps: true, collection: 'profiles' }
);
profileSchema.index({ email: 1 }, { unique: true, sparse: true });
profileSchema.index({ phone: 1 }, { unique: true, sparse: true });
profileSchema.index({ accountStatus: 1 });

// 2. user_roles
const userRoleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'restaurant_staff', 'rider', 'super_admin'],
      required: true,
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
  },
  { timestamps: true, collection: 'user_roles' }
);
userRoleSchema.index({ userId: 1, role: 1 }, { unique: true });

// 3. addresses
const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    label: { type: String, enum: ['home', 'office', 'other'], default: 'home', required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    houseNumber: { type: String, required: true, trim: true },
    building: { type: String, trim: true },
    landmark: { type: String, trim: true },
    deliveryInstructions: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'addresses' }
);
addressSchema.index({ location: '2dsphere' });
addressSchema.index({ userId: 1, isDefault: 1 });

// 4. user_preferences
const userPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    pushOrderUpdates: { type: Boolean, default: true },
    pushPromotions: { type: Boolean, default: true },
    dietaryTags: [{ type: String }],
  },
  { timestamps: true, collection: 'user_preferences' }
);
userPreferenceSchema.index({ userId: 1 }, { unique: true });

// 5. user_devices
const userDeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    expoPushToken: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'user_devices' }
);
userDeviceSchema.index({ userId: 1, expoPushToken: 1 }, { unique: true });

// 6. user_sessions
const userSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    refreshTokenHash: { type: String, required: true },
    familyId: { type: String, required: true },
    deviceId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true, collection: 'user_sessions' }
);
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ userId: 1, revokedAt: 1 });
userSessionSchema.index({ refreshTokenHash: 1 }, { unique: true });

export type ProfileDoc = InferSchemaType<typeof profileSchema>;
export const ProfileModel = mongoose.model('Profile', profileSchema);
export const UserRoleModel = mongoose.model('UserRole', userRoleSchema);
export const AddressModel = mongoose.model('Address', addressSchema);
export const UserPreferenceModel = mongoose.model('UserPreference', userPreferenceSchema);
export const UserDeviceModel = mongoose.model('UserDevice', userDeviceSchema);
export const UserSessionModel = mongoose.model('UserSession', userSessionSchema);
