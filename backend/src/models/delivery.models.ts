import mongoose, { Schema } from 'mongoose';

// 38. riders
const riderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'car'], required: true },
    vehicleNumber: { type: String, required: true, trim: true },
    cnicMasked: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    completedCount: { type: Number, default: 0, min: 0 },
    payoutMethod: { type: String, enum: ['jazzcash', 'easypaisa', 'bank'], default: 'jazzcash' },
    payoutAccountTitle: { type: String, trim: true, default: '' },
    payoutAccountNumber: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'riders' }
);
riderSchema.index({ userId: 1 }, { unique: true });
riderSchema.index({ currentLocation: '2dsphere' });
riderSchema.index({ status: 1, isOnline: 1 });

// 39. rider_documents
const riderDocumentSchema = new Schema(
  {
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider', required: true },
    docType: { type: String, enum: ['cnic_front', 'cnic_back', 'license', 'vehicle_reg'], required: true },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Profile' },
  },
  { timestamps: true, collection: 'rider_documents' }
);
riderDocumentSchema.index({ riderId: 1, docType: 1 });

// 40. deliveries
const deliverySchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider' },
    status: {
      type: String,
      enum: ['awaiting_rider', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
      default: 'awaiting_rider',
    },
    pickupAddressSnapshot: { type: Schema.Types.Mixed, required: true },
    dropoffAddressSnapshot: { type: Schema.Types.Mixed, required: true },
    distanceMeters: { type: Number, default: 0, min: 0 },
    riderEarningMinor: { type: Number, default: 0, min: 0 },
    tipMinor: { type: Number, default: 0, min: 0 },
    proofPhotoUrl: { type: String },
    otpVerifiedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true, collection: 'deliveries' }
);
deliverySchema.index({ orderId: 1 }, { unique: true });
deliverySchema.index({ riderId: 1, status: 1, createdAt: -1 });

// 41. delivery_assignments
const deliveryAssignmentSchema = new Schema(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider', required: true },
    status: { type: String, enum: ['offered', 'accepted', 'rejected', 'expired'], default: 'offered' },
    offeredAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'delivery_assignments' }
);
// Enforces at most ONE accepted assignment per delivery
deliveryAssignmentSchema.index(
  { deliveryId: 1 },
  { unique: true, partialFilterExpression: { status: 'accepted' } }
);
deliveryAssignmentSchema.index({ riderId: 1, status: 1 });

// 42. rider_locations
const riderLocationSchema = new Schema(
  {
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider', required: true },
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true },
    },
    heading: { type: Number },
    speed: { type: Number },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'rider_locations' }
);
riderLocationSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 2_592_000 }); // 30-day TTL
riderLocationSchema.index({ deliveryId: 1, recordedAt: -1 });

// 43. delivery_status_history
const deliveryStatusHistorySchema = new Schema(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  },
  { timestamps: true, collection: 'delivery_status_history' }
);
deliveryStatusHistorySchema.index({ deliveryId: 1, createdAt: 1 });

export const RiderModel = mongoose.model('Rider', riderSchema);
export const RiderDocumentModel = mongoose.model('RiderDocument', riderDocumentSchema);
export const DeliveryModel = mongoose.model('Delivery', deliverySchema);
export const DeliveryAssignmentModel = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
export const RiderLocationModel = mongoose.model('RiderLocation', riderLocationSchema);
export const DeliveryStatusHistoryModel = mongoose.model(
  'DeliveryStatusHistory',
  deliveryStatusHistorySchema
);
