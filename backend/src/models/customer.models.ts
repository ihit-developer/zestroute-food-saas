import mongoose, { Schema } from 'mongoose';

// 51. favorites
const favoriteSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    targetType: { type: String, enum: ['restaurant', 'food_item'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true, collection: 'favorites' }
);
favoriteSchema.index({ customerId: 1, targetType: 1, targetId: 1 }, { unique: true });

// 52. reviews
const reviewSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider' },
    restaurantRating: { type: Number, required: true, min: 1, max: 5 },
    foodRating: { type: Number, required: true, min: 1, max: 5 },
    deliveryRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    ownerReply: { type: String, trim: true, maxlength: 1000 },
    ownerRepliedAt: { type: Date },
  },
  { timestamps: true, collection: 'reviews' }
);
reviewSchema.index({ orderId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ restaurantId: 1, createdAt: -1 });

// 53. review_images
const reviewImageSchema = new Schema(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
    url: { type: String, required: true },
  },
  { timestamps: true, collection: 'review_images' }
);
reviewImageSchema.index({ reviewId: 1 });

// 54. notifications
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true, collection: 'notifications' }
);
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// 55. support_tickets
const supportTicketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    targetType: { type: String, enum: ['restaurant', 'admin'], default: 'admin' },
    escalatedToAdmin: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    category: {
      type: String,
      enum: ['missing_food', 'wrong_order', 'late_delivery', 'refund', 'other'],
      required: true,
    },
    subject: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    lastReadByCustomerAt: { type: Date },
    lastReadByRestaurantAt: { type: Date },
    lastReadByAdminAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    ratingFeedback: { type: String },
  },
  { timestamps: true, collection: 'support_tickets' }
);
supportTicketSchema.index({ ticketNumber: 1 }, { unique: true });
supportTicketSchema.index({ userId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ restaurantId: 1, targetType: 1, updatedAt: -1 });

// 56. support_messages
const supportMessageSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    attachmentUrls: [{ type: String }],
  },
  { timestamps: true, collection: 'support_messages' }
);
supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

// 57. complaints
const complaintSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    againstRole: { type: String, enum: ['restaurant', 'rider', 'platform'], required: true },
    againstId: { type: Schema.Types.ObjectId },
    type: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'], default: 'open' },
    resolutionNotes: { type: String },
  },
  { timestamps: true, collection: 'complaints' }
);
complaintSchema.index({ status: 1, createdAt: -1 });

export const FavoriteModel = mongoose.model('Favorite', favoriteSchema);
export const ReviewModel = mongoose.model('Review', reviewSchema);
export const ReviewImageModel = mongoose.model('ReviewImage', reviewImageSchema);
export const NotificationModel = mongoose.model('Notification', notificationSchema);
export const SupportTicketModel = mongoose.model('SupportTicket', supportTicketSchema);
export const SupportMessageModel = mongoose.model('SupportMessage', supportMessageSchema);
export const ComplaintModel = mongoose.model('Complaint', complaintSchema);
