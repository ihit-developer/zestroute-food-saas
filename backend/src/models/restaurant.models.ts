import mongoose, { Schema } from 'mongoose';

// 7. restaurants
const restaurantSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    cuisineTypes: [{ type: String, trim: true }],
    logoUrl: { type: String },
    coverUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      required: true,
    },
    commissionBps: { type: Number, default: 1500, min: 0, max: 5000 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    bankAccountTitle: { type: String, trim: true },
    bankIbanMasked: { type: String, trim: true },
  },
  { timestamps: true, collection: 'restaurants' }
);
restaurantSchema.index({ slug: 1 }, { unique: true });
restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ status: 1, ratingAvg: -1 });
restaurantSchema.index({ name: 'text', cuisineTypes: 'text' });

// 8. restaurant_documents
const restaurantDocumentSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    docType: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
    rejectionReason: { type: String },
  },
  { timestamps: true, collection: 'restaurant_documents' }
);
restaurantDocumentSchema.index({ restaurantId: 1, status: 1 });

// 9. restaurant_branches
const restaurantBranchSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true },
    },
    deliveryRadiusMeters: { type: Number, default: 8000, min: 500 },
    minOrderMinor: { type: Number, default: 30000, min: 0 },
    deliveryFeeMinor: { type: Number, default: 12000, min: 0 },
    prepTimeMins: { type: Number, default: 25, min: 5 },
    commissionBpsOverride: { type: Number, min: 0, max: 5000 },
    isTemporarilyClosed: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'restaurant_branches' }
);
restaurantBranchSchema.index({ location: '2dsphere' });
restaurantBranchSchema.index({ restaurantId: 1, isActive: 1 });

// 10. restaurant_hours
const restaurantHourSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
    holidayDate: { type: Date },
  },
  { timestamps: true, collection: 'restaurant_hours' }
);
restaurantHourSchema.index({ branchId: 1, dayOfWeek: 1 });

// 11. restaurant_staff
const restaurantStaffSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch' },
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    title: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'restaurant_staff' }
);
restaurantStaffSchema.index({ restaurantId: 1, userId: 1 }, { unique: true });

// 12. restaurant_staff_permissions
const restaurantStaffPermissionSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'RestaurantStaff', required: true },
    permissions: [
      {
        type: String,
        enum: ['orders', 'menu', 'inventory', 'reports', 'branches'],
      },
    ],
  },
  { timestamps: true, collection: 'restaurant_staff_permissions' }
);
restaurantStaffPermissionSchema.index({ staffId: 1 }, { unique: true });

export const RestaurantModel = mongoose.model('Restaurant', restaurantSchema);
export const RestaurantDocumentModel = mongoose.model('RestaurantDocument', restaurantDocumentSchema);
export const RestaurantBranchModel = mongoose.model('RestaurantBranch', restaurantBranchSchema);
export const RestaurantHourModel = mongoose.model('RestaurantHour', restaurantHourSchema);
export const RestaurantStaffModel = mongoose.model('RestaurantStaff', restaurantStaffSchema);
export const RestaurantStaffPermissionModel = mongoose.model(
  'RestaurantStaffPermission',
  restaurantStaffPermissionSchema
);
