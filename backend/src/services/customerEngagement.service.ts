import crypto from 'node:crypto';
import mongoose from 'mongoose';
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
    const tickets = await SupportTicketModel.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    const ticketIds = tickets.map((t) => t._id);
    const messages = await SupportMessageModel.find({ ticketId: { $in: ticketIds } })
      .sort({ createdAt: -1 })
      .lean();
    const lastByTicket = new Map<string, { message: string; senderRole: string; createdAt: Date }>();
    const countByTicket = new Map<string, number>();
    for (const m of messages) {
      const k = String(m.ticketId);
      countByTicket.set(k, (countByTicket.get(k) ?? 0) + 1);
      if (!lastByTicket.has(k)) {
        lastByTicket.set(k, { message: m.message, senderRole: m.senderRole, createdAt: m.createdAt });
      }
    }
    return tickets.map((t) => {
      const last = lastByTicket.get(String(t._id));
      return {
        ...t,
        id: String(t._id),
        messageCount: countByTicket.get(String(t._id)) ?? 0,
        lastMessage: last?.message ?? '',
        lastSenderRole: last?.senderRole ?? '',
      };
    });
  }

  static async createSupportTicket(
    userId: string,
    input: {
      orderId?: string;
      category: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
      subject: string;
      message: string;
    },
    senderRole = 'customer'
  ) {
    const ticketNumber = `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicketModel.create({
      ticketNumber,
      userId,
      orderId: input.orderId && mongoose.Types.ObjectId.isValid(input.orderId) ? input.orderId : undefined,
      category: input.category,
      subject: input.subject.trim(),
    });

    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: userId,
      senderRole,
      message: input.message.trim(),
    });

    return { ...ticket.toObject(), id: String(ticket._id) };
  }

  static async getSupportTicketDetail(ticketId: string, actorId: string, isAdmin: boolean) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const ticket = await SupportTicketModel.findById(ticketId)
      .populate('userId', 'fullName email phone')
      .lean();
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    const ownerObj = ticket.userId as unknown as { _id?: unknown; fullName?: string; email?: string; phone?: string } | null;
    const ownerId = String(ownerObj?._id ?? ticket.userId);
    if (!isAdmin && ownerId !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this support ticket');
    }

    const messages = await SupportMessageModel.find({ ticketId: ticket._id })
      .populate('senderId', 'fullName')
      .sort({ createdAt: 1 })
      .lean();

    return {
      ticket: {
        id: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        userName: ownerObj?.fullName ?? 'User',
        userEmail: ownerObj?.email ?? '',
        userPhone: ownerObj?.phone ?? '',
        createdAt: String(ticket.createdAt),
        updatedAt: String(ticket.updatedAt),
      },
      messages: messages.map((m) => {
        const sender = m.senderId as unknown as { _id?: unknown; fullName?: string } | null;
        return {
          id: String(m._id),
          senderId: String(sender?._id ?? m.senderId),
          senderName: sender?.fullName ?? (m.senderRole === 'super_admin' ? 'Dastarkhwan Support' : 'User'),
          senderRole: m.senderRole,
          message: m.message,
          createdAt: String(m.createdAt),
        };
      }),
    };
  }

  static async postSupportMessage(
    ticketId: string,
    actorId: string,
    senderRole: string,
    messageText: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const trimmed = messageText.trim();
    if (!trimmed) {
      throw new AppError(400, 'EMPTY_MESSAGE', 'Message cannot be empty');
    }
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    const isAdmin = senderRole === 'super_admin';
    if (!isAdmin && String(ticket.userId) !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this support ticket');
    }

    const msg = await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: actorId,
      senderRole,
      message: trimmed,
    });

    if (isAdmin && ticket.status === 'open') {
      ticket.status = 'in_progress';
      ticket.assignedAdminId = new mongoose.Types.ObjectId(actorId);
    } else if (!isAdmin && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      ticket.status = 'open';
    }
    ticket.updatedAt = new Date();
    await ticket.save();

    if (isAdmin) {
      await NotificationModel.create({
        userId: ticket.userId,
        type: 'support_reply',
        title: `Support Reply (${ticket.ticketNumber})`,
        body: trimmed.slice(0, 120),
        data: { ticketId: String(ticket._id) },
      }).catch(() => {});
    }

    return {
      id: String(msg._id),
      senderId: actorId,
      senderRole,
      message: msg.message,
      createdAt: String(msg.createdAt),
    };
  }

  static async listAllSupportTicketsForAdmin() {
    const tickets = await SupportTicketModel.find()
      .populate('userId', 'fullName email phone')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(150)
      .lean();
    const ticketIds = tickets.map((t) => t._id);
    const messages = await SupportMessageModel.find({ ticketId: { $in: ticketIds } })
      .sort({ createdAt: -1 })
      .lean();
    const lastByTicket = new Map<string, { message: string; senderRole: string; createdAt: Date }>();
    const countByTicket = new Map<string, number>();
    for (const m of messages) {
      const k = String(m.ticketId);
      countByTicket.set(k, (countByTicket.get(k) ?? 0) + 1);
      if (!lastByTicket.has(k)) {
        lastByTicket.set(k, { message: m.message, senderRole: m.senderRole, createdAt: m.createdAt });
      }
    }
    return tickets.map((t) => {
      const u = t.userId as unknown as { fullName?: string; email?: string; phone?: string } | null;
      const last = lastByTicket.get(String(t._id));
      return {
        id: String(t._id),
        ticketNumber: t.ticketNumber,
        userName: u?.fullName ?? 'User',
        userEmail: u?.email ?? '',
        userPhone: u?.phone ?? '',
        category: t.category,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        messageCount: countByTicket.get(String(t._id)) ?? 0,
        lastMessage: last?.message ?? '',
        lastSenderRole: last?.senderRole ?? '',
        createdAt: String(t.createdAt),
        updatedAt: String(t.updatedAt),
      };
    });
  }

  static async updateSupportTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const updated = await SupportTicketModel.findByIdAndUpdate(
      ticketId,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    return { ...updated, id: String(updated._id) };
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
