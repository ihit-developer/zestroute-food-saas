import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  AddressModel,
  CustomerWalletModel,
  DeliveryModel,
  FavoriteModel,
  FoodImageModel,
  FoodItemModel,
  NotificationModel,
  OrderItemModel,
  OrderModel,
  ProfileModel,
  RestaurantBranchModel,
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
    const favs = await FavoriteModel.find({ customerId }).sort({ createdAt: -1 }).lean();
    const restIds = favs.filter((f) => f.targetType === 'restaurant').map((f) => f.targetId);
    const foodIds = favs.filter((f) => f.targetType === 'food_item').map((f) => f.targetId);

    const [restaurants, branches, foods, foodImages] = await Promise.all([
      restIds.length > 0 ? RestaurantModel.find({ _id: { $in: restIds } }).lean() : Promise.resolve([]),
      restIds.length > 0 ? RestaurantBranchModel.find({ restaurantId: { $in: restIds } }).lean() : Promise.resolve([]),
      foodIds.length > 0 ? FoodItemModel.find({ _id: { $in: foodIds } }).lean() : Promise.resolve([]),
      foodIds.length > 0 ? FoodImageModel.find({ foodItemId: { $in: foodIds }, isPrimary: true }).lean() : Promise.resolve([]),
    ]);

    const foodRestIds = Array.from(new Set(foods.map((f) => String(f.restaurantId))));
    const foodRests =
      foodRestIds.length > 0
        ? await RestaurantModel.find({ _id: { $in: foodRestIds } }).select('name').lean()
        : [];
    const restNameById = new Map(foodRests.map((r) => [String(r._id), r.name]));
    const branchByRestId = new Map(branches.map((b) => [String(b.restaurantId), b]));
    const imgByFoodId = new Map(foodImages.map((i) => [String(i.foodItemId), i.url]));

    return {
      restaurants: restaurants.map((r) => {
        const b = branchByRestId.get(String(r._id));
        return {
          id: String(r._id),
          name: r.name,
          cuisineLabel: r.cuisineTypes.join(' • ') || 'Multi-Cuisine',
          locationLabel: b ? `${b.area}, ${b.city}` : 'Lahore',
          logoUrl: r.logoUrl,
          coverUrl: r.coverUrl,
          rating: r.ratingAvg,
          ratingCount: r.ratingCount,
          deliveryTimeLabel: b ? `${b.prepTimeMins}-${b.prepTimeMins + 10} mins` : '25-35 mins',
          deliveryFeeMinor: b?.deliveryFeeMinor ?? 12000,
          minOrderMinor: b?.minOrderMinor ?? 30000,
          isOpen: b ? !b.isTemporarilyClosed && b.isActive : true,
        };
      }),
      foods: foods.map((f) => ({
        id: String(f._id),
        restaurantId: String(f.restaurantId),
        restaurantName: restNameById.get(String(f.restaurantId)) ?? 'Dastarkhwan Kitchen',
        name: f.name,
        description: f.description,
        imageUrl: imgByFoodId.get(String(f._id)),
        regularPriceMinor: f.regularPriceMinor,
        discountPriceMinor: f.discountPriceMinor,
        rating: f.ratingAvg,
        prepTimeMins: f.prepTimeMins,
        isAvailable: f.isAvailable,
      })),
      recent: [],
    };
  }

  static async toggleFavorite(
    customerId: string,
    targetType: 'restaurant' | 'food_item' | 'food',
    targetId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new AppError(400, 'INVALID_TARGET', 'Invalid favorite item ID');
    }
    const normalizedType: 'restaurant' | 'food_item' =
      targetType === 'restaurant' ? 'restaurant' : 'food_item';
    const existing = await FavoriteModel.findOne({
      customerId,
      targetType: normalizedType,
      targetId,
    });
    if (existing) {
      await existing.deleteOne();
      return { favorited: false };
    }
    await FavoriteModel.create({ customerId, targetType: normalizedType, targetId });
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

  private static async buildOrderSummaryMap(orderIds: mongoose.Types.ObjectId[]) {
    const map = new Map<
      string,
      {
        id: string;
        orderNumber: string;
        restaurantId: string;
        restaurantName: string;
        status: string;
        totalMinor: number;
        paymentMethod: string;
        itemsSummary: string;
        createdAt: string;
      }
    >();
    if (orderIds.length === 0) return map;

    const orders = await OrderModel.find({ _id: { $in: orderIds } })
      .populate('restaurantId', 'name')
      .lean();
    const items = await OrderItemModel.find({ orderId: { $in: orderIds } }).lean();
    const itemsByOrder = new Map<string, string[]>();
    for (const it of items) {
      const k = String(it.orderId);
      const arr = itemsByOrder.get(k) ?? [];
      arr.push(`${it.quantity}x ${it.nameSnapshot}`);
      itemsByOrder.set(k, arr);
    }
    for (const o of orders) {
      const rest = o.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      const k = String(o._id);
      map.set(k, {
        id: k,
        orderNumber: o.orderNumber,
        restaurantId: String(rest?._id ?? o.restaurantId ?? ''),
        restaurantName: rest?.name ?? 'Restaurant',
        status: o.status,
        totalMinor: o.totalMinor,
        paymentMethod: o.paymentMethod,
        itemsSummary: (itemsByOrder.get(k) ?? []).join(', ') || 'Food Order',
        createdAt: String(o.createdAt),
      });
    }
    return map;
  }

  private static readonly INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  private static async closeInactiveTicketsIfNeeded(ticketIds?: mongoose.Types.ObjectId[]) {
    const cutoff = new Date(Date.now() - this.INACTIVITY_TIMEOUT_MS);
    const filter: Record<string, unknown> = {
      status: { $in: ['open', 'in_progress'] },
      $or: [
        { lastActivityAt: { $lt: cutoff } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: cutoff } },
      ],
    };
    if (ticketIds && ticketIds.length > 0) {
      filter._id = { $in: ticketIds };
    }
    const stale = await SupportTicketModel.find(filter)
      .select('_id userId')
      .limit(50)
      .lean();
    if (stale.length === 0) return;

    const now = new Date();
    const staleIds = stale.map((t) => t._id);
    await SupportTicketModel.updateMany(
      { _id: { $in: staleIds } },
      {
        $set: {
          status: 'closed',
          closedReason: 'inactivity',
          closedAt: now,
          typingExpiresAt: undefined,
        },
      }
    );

    await SupportMessageModel.insertMany(
      stale.map((t) => ({
        ticketId: t._id,
        senderId: t.userId,
        senderRole: 'system',
        message:
          'Chat automatically closed due to inactivity (no messages for 15 minutes). Send a new message anytime to reopen.',
      }))
    ).catch(() => {});
  }

  private static async canRestaurantAccessTicket(
    actorId: string,
    ticketRestaurantId?: mongoose.Types.ObjectId | null
  ): Promise<boolean> {
    if (!ticketRestaurantId) return false;
    const owned = await RestaurantModel.findOne({ _id: ticketRestaurantId, ownerId: actorId })
      .select('_id')
      .lean();
    return Boolean(owned);
  }

  static async listSupportTickets(
    userId: string,
    viewerRole: 'customer' | 'rider' | 'restaurant_owner' = 'customer',
    activeRestaurantId?: string
  ) {
    await this.closeInactiveTicketsIfNeeded();
    let query: Record<string, unknown> = { userId };
    let ownedRestIds: mongoose.Types.ObjectId[] = [];

    if (viewerRole === 'restaurant_owner') {
      const ownedRests = await RestaurantModel.find({ ownerId: userId }).select('_id').lean();
      ownedRestIds = ownedRests.map((r) => r._id);
      const targetRestIds =
        activeRestaurantId && mongoose.Types.ObjectId.isValid(activeRestaurantId)
          ? ownedRestIds.filter((id) => String(id) === activeRestaurantId)
          : ownedRestIds;
      query = {
        $or: [
          { userId },
          ...(targetRestIds.length > 0
            ? [{ restaurantId: { $in: targetRestIds }, targetType: 'restaurant' }]
            : []),
        ],
      };
    }

    const tickets = await SupportTicketModel.find(query)
      .populate('userId', 'fullName email phone')
      .populate('restaurantId', 'name')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(120)
      .lean();

    const ticketIds = tickets.map((t) => t._id);
    const orderIds = tickets
      .map((t) => t.orderId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const [messages, orderMap] = await Promise.all([
      SupportMessageModel.find({ ticketId: { $in: ticketIds } }).sort({ createdAt: -1 }).lean(),
      this.buildOrderSummaryMap(orderIds),
    ]);

    const lastByTicket = new Map<string, { message: string; senderRole: string; createdAt: Date }>();
    const countByTicket = new Map<string, number>();
    const msgsByTicket = new Map<string, Array<{ senderRole: string; createdAt: Date }>>();
    for (const m of messages) {
      const k = String(m.ticketId);
      countByTicket.set(k, (countByTicket.get(k) ?? 0) + 1);
      const list = msgsByTicket.get(k) ?? [];
      list.push({ senderRole: m.senderRole, createdAt: m.createdAt });
      msgsByTicket.set(k, list);
      if (!lastByTicket.has(k)) {
        lastByTicket.set(k, { message: m.message, senderRole: m.senderRole, createdAt: m.createdAt });
      }
    }

    return tickets.map((t) => {
      const idStr = String(t._id);
      const last = lastByTicket.get(idStr);
      const u = t.userId as unknown as { _id?: unknown; fullName?: string; email?: string; phone?: string } | null;
      const rest = t.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      const isCustomerChatForRestaurant =
        viewerRole === 'restaurant_owner' && String(u?._id ?? t.userId) !== userId;

      const lastReadAt =
        viewerRole === 'restaurant_owner'
          ? t.lastReadByRestaurantAt
          : t.lastReadByCustomerAt;
      const unreadCount = (msgsByTicket.get(idStr) ?? []).filter((m) => {
        const isFromMe =
          viewerRole === 'restaurant_owner'
            ? m.senderRole === 'restaurant_owner'
            : m.senderRole === viewerRole;
        if (isFromMe) return false;
        if (!lastReadAt) return true;
        return new Date(m.createdAt).getTime() > new Date(lastReadAt).getTime();
      }).length;

      return {
        id: idStr,
        ticketNumber: t.ticketNumber,
        category: t.category,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        targetType: t.targetType ?? 'admin',
        channel: isCustomerChatForRestaurant ? 'customer_chat' : 'admin_support',
        restaurantId: rest?._id ? String(rest._id) : t.restaurantId ? String(t.restaurantId) : undefined,
        restaurantName: rest?.name ?? undefined,
        escalatedToAdmin: Boolean(t.escalatedToAdmin),
        rating: t.rating ?? undefined,
        ratingFeedback: t.ratingFeedback ?? undefined,
        userName: u?.fullName ?? 'User',
        userEmail: u?.email ?? '',
        userPhone: u?.phone ?? '',
        orderSummary: t.orderId ? orderMap.get(String(t.orderId)) : undefined,
        messageCount: countByTicket.get(idStr) ?? 0,
        unreadCount,
        lastMessage: last?.message ?? '',
        lastSenderRole: last?.senderRole ?? '',
        createdAt: String(t.createdAt),
        updatedAt: String(t.updatedAt),
      };
    });
  }

  static async createSupportTicket(
    userId: string,
    input: {
      orderId?: string;
      orderNumber?: string;
      restaurantId?: string;
      targetType?: 'restaurant' | 'admin';
      category: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
      subject: string;
      message: string;
    },
    senderRole = 'customer'
  ) {
    let resolvedOrderId: mongoose.Types.ObjectId | undefined;
    let resolvedRestaurantId: mongoose.Types.ObjectId | undefined;

    if (input.orderId && mongoose.Types.ObjectId.isValid(input.orderId)) {
      const ord = await OrderModel.findById(input.orderId).select('_id restaurantId').lean();
      if (ord) {
        resolvedOrderId = ord._id;
        resolvedRestaurantId = ord.restaurantId;
      }
    } else if (input.orderNumber?.trim()) {
      const ord = await OrderModel.findOne({
        orderNumber: { $regex: `^${input.orderNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      })
        .select('_id restaurantId')
        .lean();
      if (ord) {
        resolvedOrderId = ord._id;
        resolvedRestaurantId = ord.restaurantId;
      }
    }

    if (!resolvedRestaurantId && input.restaurantId && mongoose.Types.ObjectId.isValid(input.restaurantId)) {
      resolvedRestaurantId = new mongoose.Types.ObjectId(input.restaurantId);
    }

    const targetType: 'restaurant' | 'admin' =
      senderRole === 'restaurant_owner'
        ? 'admin'
        : input.targetType === 'restaurant' && resolvedRestaurantId
          ? 'restaurant'
          : 'admin';

    const now = new Date();
    const ticketNumber = `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicketModel.create({
      ticketNumber,
      userId,
      orderId: resolvedOrderId,
      restaurantId: resolvedRestaurantId,
      targetType,
      category: input.category,
      subject: input.subject.trim(),
      lastReadByCustomerAt: senderRole === 'customer' || senderRole === 'rider' ? now : undefined,
      lastReadByRestaurantAt: senderRole === 'restaurant_owner' ? now : undefined,
      lastActivityAt: now,
    });

    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: userId,
      senderRole,
      message: input.message.trim(),
    });

    return { ...ticket.toObject(), id: String(ticket._id) };
  }

  static async getSupportTicketDetail(ticketId: string, actorId: string, actorRoles: string[]) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    await this.closeInactiveTicketsIfNeeded([new mongoose.Types.ObjectId(ticketId)]);
    const ticket = await SupportTicketModel.findById(ticketId)
      .populate('userId', 'fullName email phone')
      .populate('restaurantId', 'name ownerId')
      .lean();
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    const isAdmin = actorRoles.includes('super_admin');
    const isRestaurantRole = actorRoles.includes('restaurant_owner') || actorRoles.includes('restaurant_staff');
    const ownerObj = ticket.userId as unknown as { _id?: unknown; fullName?: string; email?: string; phone?: string } | null;
    const restObj = ticket.restaurantId as unknown as { _id?: unknown; name?: string; ownerId?: unknown } | null;
    const ownerId = String(ownerObj?._id ?? ticket.userId);
    const isOwningRestaurant =
      isRestaurantRole &&
      (String(restObj?.ownerId ?? '') === actorId ||
        (await this.canRestaurantAccessTicket(actorId, restObj?._id as mongoose.Types.ObjectId | undefined)));

    if (!isAdmin && ownerId !== actorId && !isOwningRestaurant) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this support ticket');
    }

    // Mark read timestamp for the current viewer
    const now = new Date();
    const readPatch: Record<string, Date> = {};
    if (isAdmin) {
      readPatch.lastReadByAdminAt = now;
    } else if (isOwningRestaurant || (isRestaurantRole && ownerId === actorId)) {
      readPatch.lastReadByRestaurantAt = now;
    } else {
      readPatch.lastReadByCustomerAt = now;
    }
    await SupportTicketModel.updateOne({ _id: ticket._id }, { $set: readPatch }).catch(() => {});

    const [messages, orderMap] = await Promise.all([
      SupportMessageModel.find({ ticketId: ticket._id })
        .populate('senderId', 'fullName')
        .sort({ createdAt: 1 })
        .lean(),
      ticket.orderId ? this.buildOrderSummaryMap([ticket.orderId]) : Promise.resolve(new Map()),
    ]);

    const adminReadTime = (readPatch.lastReadByAdminAt ?? ticket.lastReadByAdminAt)?.getTime() ?? 0;
    const restReadTime = (readPatch.lastReadByRestaurantAt ?? ticket.lastReadByRestaurantAt)?.getTime() ?? 0;
    const custReadTime = (readPatch.lastReadByCustomerAt ?? ticket.lastReadByCustomerAt)?.getTime() ?? 0;

    const viewerRole = isAdmin
      ? 'super_admin'
      : isOwningRestaurant || (isRestaurantRole && ownerId === actorId)
        ? 'restaurant_owner'
        : 'customer';
    const isTypingActive =
      Boolean(ticket.typingExpiresAt) &&
      new Date(ticket.typingExpiresAt!).getTime() > now.getTime() &&
      ticket.typingRole !== viewerRole;

    const lastActTime = new Date(ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt).getTime();
    const msLeft = Math.max(0, this.INACTIVITY_TIMEOUT_MS - (now.getTime() - lastActTime));
    const inactivityMinutesLeft =
      ticket.status === 'open' || ticket.status === 'in_progress'
        ? Math.ceil(msLeft / 60_000)
        : 0;

    return {
      ticket: {
        id: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        targetType: ticket.targetType ?? 'admin',
        restaurantId: restObj?._id ? String(restObj._id) : undefined,
        restaurantName: restObj?.name ?? undefined,
        escalatedToAdmin: Boolean(ticket.escalatedToAdmin),
        escalatedAt: ticket.escalatedAt ? String(ticket.escalatedAt) : undefined,
        closedReason: ticket.closedReason ?? undefined,
        closedAt: ticket.closedAt ? String(ticket.closedAt) : undefined,
        activeAgentName: ticket.activeAgentName ?? undefined,
        lastActivityAt: new Date(lastActTime).toISOString(),
        inactivityMinutesLeft,
        typing: isTypingActive
          ? { role: ticket.typingRole ?? 'agent', name: ticket.typingName ?? 'Support Agent' }
          : null,
        rating: ticket.rating ?? undefined,
        ratingFeedback: ticket.ratingFeedback ?? undefined,
        userName: ownerObj?.fullName ?? 'User',
        userEmail: ownerObj?.email ?? '',
        userPhone: ownerObj?.phone ?? '',
        orderSummary: ticket.orderId ? orderMap.get(String(ticket.orderId)) : undefined,
        createdAt: String(ticket.createdAt),
        updatedAt: String(ticket.updatedAt),
      },
      messages: messages.map((m) => {
        const sender = m.senderId as unknown as { _id?: unknown; fullName?: string } | null;
        const msgTime = new Date(m.createdAt).getTime();
        let isSeen = false;
        if (m.senderRole === 'customer' || m.senderRole === 'rider') {
          isSeen =
            ticket.targetType === 'restaurant'
              ? restReadTime >= msgTime || adminReadTime >= msgTime
              : adminReadTime >= msgTime;
        } else if (m.senderRole === 'restaurant_owner') {
          isSeen =
            ticket.targetType === 'restaurant'
              ? custReadTime >= msgTime
              : adminReadTime >= msgTime;
        } else if (m.senderRole === 'super_admin') {
          isSeen = custReadTime >= msgTime || restReadTime >= msgTime;
        }
        return {
          id: String(m._id),
          senderId: String(sender?._id ?? m.senderId),
          senderName:
            sender?.fullName ??
            (m.senderRole === 'super_admin'
              ? 'Dastarkhwan Support'
              : m.senderRole === 'restaurant_owner'
                ? restObj?.name ?? 'Restaurant Partner'
                : 'Customer'),
          senderRole: m.senderRole,
          message: m.message,
          isSeen,
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
    const isOwningRestaurant =
      senderRole === 'restaurant_owner' &&
      (await this.canRestaurantAccessTicket(actorId, ticket.restaurantId));

    if (!isAdmin && String(ticket.userId) !== actorId && !isOwningRestaurant) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this support ticket');
    }

    const now = new Date();
    const wasAgentAssigned = Boolean(ticket.activeAgentName);

    if (isAdmin || isOwningRestaurant) {
      if (!wasAgentAssigned) {
        const actorProfile = await ProfileModel.findById(actorId).select('fullName').lean();
        const agentName = isAdmin
          ? actorProfile?.fullName || 'Dastarkhwan Live Agent'
          : actorProfile?.fullName || 'Restaurant Live Agent';
        ticket.activeAgentName = agentName;
        await SupportMessageModel.create({
          ticketId: ticket._id,
          senderId: actorId,
          senderRole: 'system',
          message: `Live Agent ${agentName} joined the conversation.`,
        }).catch(() => {});
      }
    }

    const msg = await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: actorId,
      senderRole,
      message: trimmed,
    });

    if (isAdmin) {
      ticket.lastReadByAdminAt = now;
      if (ticket.status === 'open' || ticket.status === 'closed') {
        ticket.status = 'in_progress';
        ticket.assignedAdminId = new mongoose.Types.ObjectId(actorId);
      }
    } else if (isOwningRestaurant) {
      ticket.lastReadByRestaurantAt = now;
      if (ticket.status === 'open' || ticket.status === 'closed') {
        ticket.status = 'in_progress';
      }
    } else {
      if (senderRole === 'restaurant_owner') {
        ticket.lastReadByRestaurantAt = now;
      } else {
        ticket.lastReadByCustomerAt = now;
      }
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        ticket.status = 'open';
      }
    }
    ticket.lastActivityAt = now;
    ticket.closedReason = undefined;
    ticket.closedAt = undefined;
    ticket.typingExpiresAt = undefined;
    ticket.updatedAt = now;
    await ticket.save();

    if ((isAdmin || isOwningRestaurant) && String(ticket.userId) !== actorId) {
      const senderLabel = isAdmin ? 'Dastarkhwan Support' : 'Restaurant Support';
      await NotificationModel.create({
        userId: ticket.userId,
        type: 'support_reply',
        title: `${senderLabel} Reply (${ticket.ticketNumber})`,
        body: trimmed.slice(0, 120),
        data: { ticketId: String(ticket._id) },
      }).catch(() => {});
    }

    return {
      id: String(msg._id),
      senderId: actorId,
      senderRole,
      message: msg.message,
      isSeen: false,
      createdAt: String(msg.createdAt),
    };
  }

  static async setSupportTyping(ticketId: string, actorId: string, actorRoles: string[]) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const ticket = await SupportTicketModel.findById(ticketId).select('_id userId restaurantId').lean();
    if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');

    const isAdmin = actorRoles.includes('super_admin');
    const isRestaurantRole = actorRoles.includes('restaurant_owner') || actorRoles.includes('restaurant_staff');
    const isOwningRestaurant =
      isRestaurantRole && (await this.canRestaurantAccessTicket(actorId, ticket.restaurantId));

    if (!isAdmin && String(ticket.userId) !== actorId && !isOwningRestaurant) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this support ticket');
    }

    const actorProfile = await ProfileModel.findById(actorId).select('fullName').lean();
    const typingRole = isAdmin
      ? 'super_admin'
      : isOwningRestaurant || (isRestaurantRole && String(ticket.userId) === actorId)
        ? 'restaurant_owner'
        : 'customer';
    const typingName = isAdmin
      ? actorProfile?.fullName || 'Dastarkhwan Live Agent'
      : typingRole === 'restaurant_owner'
        ? actorProfile?.fullName || 'Restaurant Agent'
        : actorProfile?.fullName || 'Customer';

    const expiresAt = new Date(Date.now() + 5500);
    await SupportTicketModel.updateOne(
      { _id: ticket._id },
      { $set: { typingRole, typingName, typingExpiresAt: expiresAt } }
    );
    return { typing: true, expiresAt: expiresAt.toISOString() };
  }

  static async escalateSupportTicket(ticketId: string, actorId: string) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    if (String(ticket.userId) !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the ticket creator can escalate this chat');
    }
    if (!ticket.escalatedToAdmin) {
      ticket.escalatedToAdmin = true;
      ticket.escalatedAt = new Date();
      ticket.priority = 'high';
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        ticket.status = 'open';
      }
      ticket.updatedAt = new Date();
      await ticket.save();

      await SupportMessageModel.create({
        ticketId: ticket._id,
        senderId: actorId,
        senderRole: 'system',
        message: 'Escalated to Dastarkhwan Super Admin for priority assistance.',
      });
    }
    return { id: String(ticket._id), escalatedToAdmin: true, priority: ticket.priority };
  }

  static async rateSupportTicket(
    ticketId: string,
    actorId: string,
    rating: number,
    feedback?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'INVALID_RATING', 'Rating must be between 1 and 5');
    }
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    if (String(ticket.userId) !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the ticket creator can rate this support session');
    }
    ticket.rating = rating;
    if (feedback?.trim()) {
      ticket.ratingFeedback = feedback.trim().slice(0, 500);
    }
    await ticket.save();
    return { id: String(ticket._id), rating: ticket.rating, ratingFeedback: ticket.ratingFeedback };
  }

  static async updateSupportTicketStatusByActor(
    ticketId: string,
    actorId: string,
    actorRoles: string[],
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    const isAdmin = actorRoles.includes('super_admin');
    const isOwningRestaurant =
      (actorRoles.includes('restaurant_owner') || actorRoles.includes('restaurant_staff')) &&
      (await this.canRestaurantAccessTicket(actorId, ticket.restaurantId));
    if (!isAdmin && !isOwningRestaurant) {
      throw new AppError(403, 'FORBIDDEN', 'Only Support Admin or Restaurant Partner can update status');
    }
    ticket.status = status;
    ticket.updatedAt = new Date();
    await ticket.save();
    return { ...ticket.toObject(), id: String(ticket._id) };
  }

  static async listAllSupportTicketsForAdmin() {
    await this.closeInactiveTicketsIfNeeded();
    const tickets = await SupportTicketModel.find()
      .populate('userId', 'fullName email phone')
      .populate('restaurantId', 'name')
      .sort({ escalatedToAdmin: -1, updatedAt: -1, createdAt: -1 })
      .limit(150)
      .lean();
    const ticketIds = tickets.map((t) => t._id);
    const orderIds = tickets
      .map((t) => t.orderId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const [messages, orderMap] = await Promise.all([
      SupportMessageModel.find({ ticketId: { $in: ticketIds } }).sort({ createdAt: -1 }).lean(),
      this.buildOrderSummaryMap(orderIds),
    ]);
    const lastByTicket = new Map<string, { message: string; senderRole: string; createdAt: Date }>();
    const countByTicket = new Map<string, number>();
    const msgsByTicket = new Map<string, Array<{ senderRole: string; createdAt: Date }>>();
    for (const m of messages) {
      const k = String(m.ticketId);
      countByTicket.set(k, (countByTicket.get(k) ?? 0) + 1);
      const arr = msgsByTicket.get(k) ?? [];
      arr.push({ senderRole: m.senderRole, createdAt: m.createdAt });
      msgsByTicket.set(k, arr);
      if (!lastByTicket.has(k)) {
        lastByTicket.set(k, { message: m.message, senderRole: m.senderRole, createdAt: m.createdAt });
      }
    }
    return tickets.map((t) => {
      const idStr = String(t._id);
      const u = t.userId as unknown as { fullName?: string; email?: string; phone?: string } | null;
      const rest = t.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      const last = lastByTicket.get(idStr);
      const unreadCount = (msgsByTicket.get(idStr) ?? []).filter((m) => {
        if (m.senderRole === 'super_admin') return false;
        if (!t.lastReadByAdminAt) return true;
        return new Date(m.createdAt).getTime() > new Date(t.lastReadByAdminAt).getTime();
      }).length;
      return {
        id: idStr,
        ticketNumber: t.ticketNumber,
        userName: u?.fullName ?? 'User',
        userEmail: u?.email ?? '',
        userPhone: u?.phone ?? '',
        targetType: t.targetType ?? 'admin',
        restaurantId: rest?._id ? String(rest._id) : undefined,
        restaurantName: rest?.name ?? undefined,
        escalatedToAdmin: Boolean(t.escalatedToAdmin),
        rating: t.rating ?? undefined,
        ratingFeedback: t.ratingFeedback ?? undefined,
        orderSummary: t.orderId ? orderMap.get(String(t.orderId)) : undefined,
        category: t.category,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        messageCount: countByTicket.get(idStr) ?? 0,
        unreadCount,
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

  static async adminCreateSupportTicket(
    adminId: string,
    input: {
      userEmail?: string;
      category?: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
      priority?: 'low' | 'medium' | 'high';
      subject: string;
      message: string;
    }
  ) {
    if (!input.subject?.trim() || !input.message?.trim()) {
      throw new AppError(400, 'INVALID_TICKET', 'Subject and initial message are required');
    }
    let targetUserId = adminId;
    if (input.userEmail?.trim()) {
      const found = await ProfileModel.findOne({ email: input.userEmail.trim().toLowerCase() }).select('_id').lean();
      if (!found) {
        throw new AppError(404, 'USER_NOT_FOUND', `No user found with email ${input.userEmail.trim()}`);
      }
      targetUserId = String(found._id);
    }
    const ticketNumber = `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicketModel.create({
      ticketNumber,
      userId: targetUserId,
      category: input.category ?? 'other',
      priority: input.priority ?? 'medium',
      subject: input.subject.trim(),
      status: 'open',
      assignedAdminId: adminId,
    });
    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderId: adminId,
      senderRole: 'super_admin',
      message: input.message.trim(),
    });
    if (targetUserId !== adminId) {
      await NotificationModel.create({
        userId: targetUserId,
        type: 'support_reply',
        title: `New Support Message (${ticketNumber})`,
        body: input.message.trim().slice(0, 120),
        data: { ticketId: String(ticket._id) },
      }).catch(() => {});
    }
    return { ...ticket.toObject(), id: String(ticket._id) };
  }

  static async adminUpdateSupportTicket(
    ticketId: string,
    input: {
      subject?: string;
      category?: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
      priority?: 'low' | 'medium' | 'high';
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    }
  ) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const patch: Record<string, unknown> = {};
    if (input.subject?.trim()) patch.subject = input.subject.trim();
    if (input.category) patch.category = input.category;
    if (input.priority) patch.priority = input.priority;
    if (input.status) patch.status = input.status;

    const updated = await SupportTicketModel.findByIdAndUpdate(
      ticketId,
      { $set: patch },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    return { ...updated, id: String(updated._id) };
  }

  static async adminDeleteSupportTicket(ticketId: string) {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new AppError(400, 'INVALID_TICKET', 'Invalid ticket ID');
    }
    const deleted = await SupportTicketModel.findByIdAndDelete(ticketId).lean();
    if (!deleted) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    await SupportMessageModel.deleteMany({ ticketId: deleted._id });
    return { deleted: true, id: ticketId };
  }

  static async adminDeleteSupportMessage(ticketId: string, messageId: string) {
    if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid ticket or message ID');
    }
    const deleted = await SupportMessageModel.findOneAndDelete({ _id: messageId, ticketId }).lean();
    if (!deleted) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
    return { deleted: true, id: messageId };
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
