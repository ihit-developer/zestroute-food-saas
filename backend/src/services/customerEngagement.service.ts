import crypto from 'node:crypto';
import {
  AddressModel,
  CustomerWalletModel,
  DeliveryModel,
  FavoriteModel,
  NotificationModel,
  OrderModel,
  ProfileModel,
  RestaurantModel,
  ReviewModel,
  RiderModel,
  SupportMessageModel,
  SupportTicketModel,
  WalletTransactionModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class CustomerEngagementService {
  static async listAddresses(userId: string) {
    return AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  }

  static async createAddress(
    userId: string,
    input: {
      label: 'home' | 'office' | 'other';
      fullName: string;
      phone: string;
      city: string;
      area: string;
      street: string;
      houseNumber: string;
      building?: string;
      landmark?: string;
      deliveryInstructions?: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
    }
  ) {
    if (input.isDefault) {
      await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }
    return AddressModel.create({
      userId,
      ...input,
      location: { type: 'Point', coordinates: [input.longitude, input.latitude] },
    });
  }

  static async deleteAddress(userId: string, addressId: string) {
    const deleted = await AddressModel.findOneAndDelete({ _id: addressId, userId });
    if (!deleted) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }

  static async listFavorites(customerId: string) {
    const favs = await FavoriteModel.find({ customerId }).lean();
    return {
      restaurants: favs.filter((f) => f.targetType === 'restaurant'),
      foods: favs.filter((f) => f.targetType === 'food_item'),
      recent: [],
    };
  }

  static async toggleFavorite(
    customerId: string,
    targetType: 'restaurant' | 'food_item',
    targetId: string
  ) {
    const existing = await FavoriteModel.findOne({ customerId, targetType, targetId });
    if (existing) {
      await existing.deleteOne();
      return { favorited: false };
    }
    await FavoriteModel.create({ customerId, targetType, targetId });
    return { favorited: true };
  }

  static async createReview(
    customerId: string,
    input: {
      orderId: string;
      restaurantRating: number;
      foodRating: number;
      deliveryRating?: number;
      comment?: string;
    }
  ) {
    const order = await OrderModel.findOne({ _id: input.orderId, customerId }).lean();
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    if (order.status !== 'delivered') {
      throw new AppError(400, 'REVIEW_NOT_ELIGIBLE', 'Only delivered orders can be reviewed');
    }

    const duplicate = await ReviewModel.findOne({ orderId: order._id, customerId }).lean();
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_REVIEW', 'You have already reviewed this order');
    }

    const created = await ReviewModel.create({
      customerId,
      restaurantId: order.restaurantId,
      ...input,
    });

    const stats = await ReviewModel.aggregate([
      { $match: { restaurantId: order.restaurantId } },
      { $group: { _id: '$restaurantId', avg: { $avg: '$restaurantRating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      await RestaurantModel.findByIdAndUpdate(order.restaurantId, {
        $set: {
          ratingAvg: Math.round(stats[0].avg * 10) / 10,
          ratingCount: stats[0].count,
        },
      });
    }

    // Also update Rider rating when deliveryRating is submitted
    if (input.deliveryRating) {
      const delivery = await DeliveryModel.findOne({ orderId: order._id }).select('riderId').lean();
      if (delivery?.riderId) {
        const riderDeliveries = await DeliveryModel.find({ riderId: delivery.riderId })
          .select('orderId')
          .lean();
        const riderOrderIds = riderDeliveries.map((d) => d.orderId);
        const riderStats = await ReviewModel.aggregate([
          { $match: { orderId: { $in: riderOrderIds }, deliveryRating: { $gte: 1 } } },
          { $group: { _id: null, avg: { $avg: '$deliveryRating' } } },
        ]);
        if (riderStats[0]) {
          await RiderModel.findByIdAndUpdate(delivery.riderId, {
            $set: { ratingAvg: Math.round(riderStats[0].avg * 10) / 10 },
          }).catch(() => {});
        }
      }
    }

    return created;
  }

  static async getWallet(customerId: string) {
    const wallet = await CustomerWalletModel.findOne({ customerId }).lean();
    if (!wallet) return { balanceMinor: 0, currency: 'PKR', transactions: [] };
    const transactions = await WalletTransactionModel.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return { ...wallet, transactions };
  }

  static async listNotifications(userId: string) {
    const list = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    return list.map((n) => ({
      id: String(n._id),
      title: n.title,
      body: n.body,
      type: n.type,
      data: n.data,
      isRead: Boolean(n.isRead),
      createdAt: String(n.createdAt),
    }));
  }

  static async markAllNotificationsRead(userId: string) {
    await NotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { updated: true };
  }

  static async listSupportTickets(userId: string) {
    return SupportTicketModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  static async createSupportTicket(
    userId: string,
    input: {
      orderId?: string;
      category: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
      subject: string;
      message: string;
    }
  ) {
    const ticketNumber = `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicketModel.create({
      ticketNumber,
      userId,
      orderId: input.orderId,
      category: input.category,
      subject: input.subject,
    });

    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: userId,
      senderRole: 'customer',
      message: input.message,
    });

    return ticket;
  }

  static async updateProfile(userId: string, fullName: string) {
    const updated = await ProfileModel.findByIdAndUpdate(
      userId,
      { $set: { fullName } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
    return updated;
  }
}
