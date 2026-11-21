import mongoose from 'mongoose';
import {
  DeliveryAssignmentModel,
  DeliveryModel,
  DeliveryStatusHistoryModel,
  LoyaltyAccountModel,
  LoyaltyTransactionModel,
  OrderModel,
  OrderStatusHistoryModel,
  ProfileModel,
  RiderLocationModel,
  RiderModel,
  RiderPayoutModel,
} from '../models/index.js';
import { hashPassword, hashToken, verifyPassword } from '../utils/crypto.js';
import { AppError } from '../middleware/error.middleware.js';
import { emitOrderStatusChanged, emitRiderLocation } from '../sockets/socketGateway.js';

export class RiderService {
  static async apply(
    userId: string,
    input: {
      vehicleType: 'bike' | 'scooter' | 'car';
      vehicleNumber: string;
      cnicMasked: string;
      licenseNumber: string;
    }
  ) {
    const existing = await RiderModel.findOne({ userId }).lean();
    if (existing) {
      throw new AppError(409, 'RIDER_EXISTS', 'Rider profile already registered');
    }
    const initialStatus = process.env.NODE_ENV === 'production' ? 'pending' : 'approved';
    return RiderModel.create({ userId, ...input, status: initialStatus, isOnline: false });
  }

  static async getApprovedRider(userId: string) {
    const rider = await RiderModel.findOne({ userId });
    if (!rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'Rider profile not found');
    if (rider.status !== 'approved') {
      throw new AppError(403, 'RIDER_NOT_APPROVED', 'Rider account is pending admin approval');
    }
    return rider;
  }

  static async setOnlineStatus(userId: string, isOnline: boolean) {
    const rider = await this.getApprovedRider(userId);
    rider.isOnline = isOnline;
    await rider.save();
    return { isOnline: rider.isOnline };
  }

  static async cancelDeliveryForOrder(orderId: string) {
    const del = await DeliveryModel.findOneAndUpdate(
      { orderId, status: { $nin: ['delivered', 'cancelled'] } },
      { $set: { status: 'cancelled' } },
      { new: true }
    ).lean();
    if (del) {
      await DeliveryAssignmentModel.updateMany(
        { deliveryId: del._id, status: 'offered' },
        { $set: { status: 'expired' } }
      ).catch(() => {});
    }
  }

  static async cleanupStaleRiderDeliveries(riderId: mongoose.Types.ObjectId) {
    const activeDeliveries = await DeliveryModel.find({
      riderId,
      status: { $in: ['assigned', 'picked_up', 'on_the_way'] },
    })
      .populate('orderId', 'status')
      .lean();

    for (const del of activeDeliveries) {
      const ord = del.orderId as unknown as { status?: string } | null;
      if (!ord) {
        await DeliveryModel.updateOne({ _id: del._id }, { $set: { status: 'cancelled' } }).catch(() => {});
      } else if (ord.status === 'delivered') {
        await DeliveryModel.updateOne(
          { _id: del._id },
          { $set: { status: 'delivered', deliveredAt: del.deliveredAt ?? new Date() } }
        ).catch(() => {});
      } else if (['cancelled', 'rejected', 'refund_pending', 'refunded'].includes(ord.status ?? '')) {
        await DeliveryModel.updateOne({ _id: del._id }, { $set: { status: 'cancelled' } }).catch(() => {});
      }
    }
  }

  static async getDashboard(userId: string) {
    const rider = await RiderModel.findOne({ userId }).lean();
    if (!rider) {
      return {
        isOnline: false,
        status: 'pending',
        vehicleType: 'bike',
        vehicleNumber: '',
        todayDeliveries: 0,
        completedDeliveries: 0,
        todayEarningsMinor: 0,
        weeklyEarningsMinor: 0,
        monthlyEarningsMinor: 0,
        ratingAvg: 0,
        ratingCount: 0,
        activeDelivery: null,
      };
    }

    await this.cleanupStaleRiderDeliveries(rider._id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    const [delivered, activeDoc, payouts] = await Promise.all([
      DeliveryModel.find({
        riderId: rider._id,
        status: 'delivered',
      })
        .populate('orderId', 'paymentMethod totalMinor')
        .lean(),
      DeliveryModel.findOne({
        riderId: rider._id,
        status: { $in: ['assigned', 'picked_up', 'on_the_way'] },
      })
        .populate({
          path: 'orderId',
          select: 'orderNumber status totalMinor paymentMethod customerId',
          populate: { path: 'customerId', select: 'fullName phone' },
        })
        .lean(),
      RiderPayoutModel.find({ riderId: rider._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const today = delivered.filter((d) => d.deliveredAt && new Date(d.deliveredAt) >= startOfDay);
    const weekly = delivered.filter((d) => d.deliveredAt && new Date(d.deliveredAt) >= startOfWeek);
    const monthly = delivered.filter((d) => d.deliveredAt && new Date(d.deliveredAt) >= startOfMonth);

    const getOrderCodAmount = (d: { orderId?: unknown }) => {
      const ord = d.orderId as { paymentMethod?: string; totalMinor?: number } | null;
      return ord?.paymentMethod === 'cod' ? (ord.totalMinor ?? 0) : 0;
    };

    const codCashTodayMinor = today.reduce((s, d) => s + getOrderCodAmount(d), 0);
    const codCashTotalMinor = delivered.reduce((s, d) => s + getOrderCodAmount(d), 0);
    const lifetimeEarningsMinor = delivered.reduce(
      (s, d) => s + (d.riderEarningMinor ?? 0) + (d.tipMinor ?? 0),
      0
    );
    const withdrawnMinor = payouts
      .filter((p) => p.status !== 'failed')
      .reduce((s, p) => s + (p.totalMinor ?? 0), 0);
    const availableBalanceMinor = Math.max(0, lifetimeEarningsMinor - withdrawnMinor);

    let activeDelivery = null;
    if (activeDoc) {
      const ord = activeDoc.orderId as unknown as {
        _id?: unknown;
        orderNumber?: string;
        totalMinor?: number;
        paymentMethod?: string;
        customerId?: { fullName?: string; phone?: string };
      } | null;
      const pickup = activeDoc.pickupAddressSnapshot as { name?: string; address?: string } | undefined;
      const dropoff = activeDoc.dropoffAddressSnapshot as { area?: string; street?: string; houseNumber?: string; instructions?: string } | undefined;
      activeDelivery = {
        deliveryId: String(activeDoc._id),
        orderId: String(ord?._id ?? activeDoc.orderId),
        orderNumber: ord?.orderNumber ?? 'ORD',
        status: activeDoc.status,
        restaurantName: pickup?.name ?? 'Restaurant',
        pickupLocation: pickup?.address ?? 'Kitchen Pickup',
        dropoffArea: dropoff?.area ?? 'Customer Area',
        dropoffAddress: [dropoff?.houseNumber, dropoff?.street, dropoff?.area].filter(Boolean).join(', ') || 'Customer Address',
        instructions: dropoff?.instructions ?? '',
        customerName: ord?.customerId?.fullName ?? 'Customer',
        customerPhone: ord?.customerId?.phone ?? '',
        paymentMethod: ord?.paymentMethod ?? 'cod',
        orderTotalMinor: ord?.totalMinor ?? 0,
        earningMinor: (activeDoc.riderEarningMinor ?? 0) + (activeDoc.tipMinor ?? 0),
        distanceKm: Number(((activeDoc.distanceMeters ?? 0) / 1000).toFixed(1)),
      };
    }

    return {
      isOnline: Boolean(rider.isOnline),
      status: rider.status,
      vehicleType: rider.vehicleType,
      vehicleNumber: rider.vehicleNumber ?? '',
      todayDeliveries: today.length,
      completedDeliveries: Math.max(rider.completedCount ?? 0, delivered.length),
      todayEarningsMinor: today.reduce((s, d) => s + (d.riderEarningMinor ?? 0) + (d.tipMinor ?? 0), 0),
      weeklyEarningsMinor: weekly.reduce((s, d) => s + (d.riderEarningMinor ?? 0) + (d.tipMinor ?? 0), 0),
      monthlyEarningsMinor: monthly.reduce((s, d) => s + (d.riderEarningMinor ?? 0) + (d.tipMinor ?? 0), 0),
      codCashTodayMinor,
      codCashTotalMinor,
      availableBalanceMinor,
      withdrawnMinor,
      payouts: payouts.map((p) => ({
        id: String(p._id),
        amountMinor: p.totalMinor,
        status: p.status,
        createdAt: String(p.createdAt),
      })),
      ratingAvg: rider.ratingAvg ?? 0,
      ratingCount: delivered.length,
      activeDelivery,
    };
  }

  static async ensureDeliveryForOrder(orderId: string) {
    const existing = await DeliveryModel.findOne({ orderId }).lean();
    if (existing) return existing;

    const order = await OrderModel.findById(orderId)
      .populate('restaurantId', 'name')
      .populate('branchId', 'name address area city')
      .lean();
    if (!order) return null;

    const rest = order.restaurantId as unknown as { name?: string } | null;
    const branch = order.branchId as unknown as {
      name?: string;
      address?: string;
      area?: string;
      city?: string;
    } | null;

    const pickupAddress = branch
      ? [branch.address, branch.area, branch.city].filter(Boolean).join(', ')
      : 'Lahore Kitchen';

    const created = await DeliveryModel.create({
      orderId: order._id,
      status: 'awaiting_rider',
      pickupAddressSnapshot: {
        name: rest?.name ?? 'Restaurant',
        address: pickupAddress,
      },
      dropoffAddressSnapshot: order.deliveryAddressSnapshot ?? {
        area: 'Lahore',
        street: '',
        houseNumber: '',
      },
      distanceMeters: 2800,
      riderEarningMinor: Math.max(order.deliveryFeeMinor ?? 12000, 12000),
      tipMinor: order.tipMinor ?? 0,
    }).catch(async () => DeliveryModel.findOne({ orderId }).lean());

    return created;
  }

  static async listRequests(userId: string) {
    const rider = await this.getApprovedRider(userId);

    // Auto-dispatch: ensure every active customer order awaiting a rider has a DeliveryModel record
    const activeOrders = await OrderModel.find({
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id')
      .lean();

    for (const ord of activeOrders) {
      await this.ensureDeliveryForOrder(String(ord._id)).catch(() => {});
    }

    // Ensure any open awaiting_rider deliveries have a live offer for this rider (unless rejected)
    const openDeliveries = await DeliveryModel.find({ status: 'awaiting_rider' })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    for (const del of openDeliveries) {
      const existingOffer = await DeliveryAssignmentModel.findOne({
        deliveryId: del._id,
        riderId: rider._id,
      }).lean();
      if (!existingOffer) {
        await DeliveryAssignmentModel.create({
          deliveryId: del._id,
          riderId: rider._id,
          status: 'offered',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        }).catch(() => {});
      } else if (
        existingOffer.status === 'expired' ||
        (existingOffer.status === 'offered' && new Date(existingOffer.expiresAt) <= new Date())
      ) {
        await DeliveryAssignmentModel.updateOne(
          { _id: existingOffer._id },
          { $set: { status: 'offered', expiresAt: new Date(Date.now() + 30 * 60 * 1000) } }
        ).catch(() => {});
      }
    }

    const offers = await DeliveryAssignmentModel.find({
      riderId: rider._id,
      status: 'offered',
      expiresAt: { $gt: new Date() },
    })
      .populate({
        path: 'deliveryId',
        populate: { path: 'orderId', select: 'orderNumber totalMinor paymentMethod status' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return offers
      .filter((o) => {
        const del = o.deliveryId as unknown as { status?: string; orderId?: { status?: string } | null } | null;
        if (!del || del.status !== 'awaiting_rider' || !del.orderId) return false;
        const ordStatus = del.orderId.status ?? 'pending';
        return !['cancelled', 'rejected', 'delivered', 'refund_pending', 'refunded'].includes(ordStatus);
      })
      .map((o) => {
        const del = o.deliveryId as unknown as {
          _id: string;
          distanceMeters?: number;
          riderEarningMinor?: number;
          orderId?: { orderNumber?: string; totalMinor?: number; paymentMethod?: string; status?: string };
          pickupAddressSnapshot?: { name?: string; address?: string };
          dropoffAddressSnapshot?: { area?: string; instructions?: string };
        };
        return {
          assignmentId: String(o._id),
          deliveryId: String(del?._id ?? ''),
          orderNumber: del?.orderId?.orderNumber ?? 'ORD',
          orderStatus: del?.orderId?.status ?? 'pending',
          paymentMethod: del?.orderId?.paymentMethod ?? 'cod',
          orderTotalMinor: del?.orderId?.totalMinor ?? 0,
          restaurantName: del?.pickupAddressSnapshot?.name ?? 'Restaurant',
          pickupLocation: del?.pickupAddressSnapshot?.address ?? 'Kitchen Pickup',
          dropoffArea: del?.dropoffAddressSnapshot?.area ?? 'Lahore',
          distanceKm: Number(((del?.distanceMeters ?? 2500) / 1000).toFixed(1)),
          estimatedEarningMinor: del?.riderEarningMinor ?? 12000,
          instructions: del?.dropoffAddressSnapshot?.instructions,
        };
      });
  }

  static async declineAssignment(userId: string, assignmentId: string) {
    const rider = await this.getApprovedRider(userId);
    const updated = await DeliveryAssignmentModel.findOneAndUpdate(
      { _id: assignmentId, riderId: rider._id, status: 'offered' },
      { $set: { status: 'rejected', respondedAt: new Date() } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'OFFER_NOT_FOUND', 'Delivery offer not found');
    return { declined: true, assignmentId };
  }

  static async acceptAssignment(userId: string, assignmentId: string) {
    const rider = await this.getApprovedRider(userId);
    await this.cleanupStaleRiderDeliveries(rider._id);

    // Rule 11: Prevent conflicting active deliveries
    const activeCount = await DeliveryModel.countDocuments({
      riderId: rider._id,
      status: { $in: ['assigned', 'picked_up', 'on_the_way'] },
    });
    if (activeCount > 0) {
      throw new AppError(409, 'ACTIVE_DELIVERY_EXISTS', 'Complete your active delivery first');
    }

    const session = await mongoose.startSession();
    let acceptedDeliveryId = '';

    await session.withTransaction(async () => {
      const claimed = await DeliveryAssignmentModel.findOneAndUpdate(
        {
          _id: assignmentId,
          riderId: rider._id,
          status: 'offered',
          expiresAt: { $gt: new Date() },
        },
        { $set: { status: 'accepted', respondedAt: new Date() } },
        { session, new: true }
      );

      if (!claimed) {
        throw new AppError(409, 'OFFER_UNAVAILABLE', 'Delivery offer expired or already accepted');
      }

      const delivery = await DeliveryModel.findOneAndUpdate(
        { _id: claimed.deliveryId, status: 'awaiting_rider' },
        { $set: { riderId: rider._id, status: 'assigned' } },
        { session, new: true }
      );
      if (!delivery) {
        throw new AppError(409, 'DELIVERY_ALREADY_ASSIGNED', 'Delivery was already assigned');
      }
      acceptedDeliveryId = String(delivery._id);

      await DeliveryAssignmentModel.updateMany(
        { deliveryId: delivery._id, _id: { $ne: claimed._id }, status: 'offered' },
        { $set: { status: 'expired' } },
        { session }
      );

      await OrderModel.updateOne(
        { _id: delivery.orderId },
        { $set: { status: 'rider_assigned' } },
        { session }
      );

      await Promise.all([
        DeliveryStatusHistoryModel.create(
          [{ deliveryId: delivery._id, status: 'assigned', changedBy: userId }],
          { session }
        ),
        OrderStatusHistoryModel.create(
          [
            {
              orderId: delivery.orderId,
              fromStatus: 'ready_for_pickup',
              toStatus: 'rider_assigned',
              changedBy: userId,
              role: 'rider',
            },
          ],
          { session }
        ),
      ]);
    });

    await session.endSession();
    return { deliveryId: acceptedDeliveryId, status: 'assigned' };
  }

  static async markPickedUp(userId: string, deliveryId: string) {
    const rider = await this.getApprovedRider(userId);
    const delivery = await DeliveryModel.findOne({ _id: deliveryId, riderId: rider._id });
    if (!delivery || delivery.status !== 'assigned') {
      throw new AppError(400, 'INVALID_PICKUP_STATE', 'Delivery is not ready for pickup');
    }

    delivery.status = 'picked_up';
    await delivery.save();

    const order = await OrderModel.findByIdAndUpdate(
      delivery.orderId,
      { $set: { status: 'picked_up' } },
      { new: true }
    ).lean();

    await Promise.all([
      DeliveryStatusHistoryModel.create({ deliveryId: delivery._id, status: 'picked_up', changedBy: userId }),
      OrderStatusHistoryModel.create({
        orderId: delivery.orderId,
        fromStatus: 'rider_assigned',
        toStatus: 'picked_up',
        changedBy: userId,
        role: 'rider',
      }),
    ]);

    if (order) {
      emitOrderStatusChanged(String(delivery.orderId), String(order.customerId), {
        orderId: String(delivery.orderId),
        fromStatus: 'rider_assigned',
        toStatus: 'picked_up',
        timestamp: new Date().toISOString(),
      });
    }

    return delivery.toObject();
  }

  static async markOnTheWay(userId: string, deliveryId: string) {
    const rider = await this.getApprovedRider(userId);
    const delivery = await DeliveryModel.findOne({ _id: deliveryId, riderId: rider._id });
    if (!delivery || delivery.status !== 'picked_up') {
      throw new AppError(400, 'INVALID_TRANSIT_STATE', 'Delivery must be picked up first');
    }

    delivery.status = 'on_the_way';
    await delivery.save();

    const order = await OrderModel.findByIdAndUpdate(
      delivery.orderId,
      { $set: { status: 'on_the_way' } },
      { new: true }
    ).lean();

    await Promise.all([
      DeliveryStatusHistoryModel.create({ deliveryId: delivery._id, status: 'on_the_way', changedBy: userId }),
      OrderStatusHistoryModel.create({
        orderId: delivery.orderId,
        fromStatus: 'picked_up',
        toStatus: 'on_the_way',
        changedBy: userId,
        role: 'rider',
      }),
    ]);

    if (order) {
      emitOrderStatusChanged(String(delivery.orderId), String(order.customerId), {
        orderId: String(delivery.orderId),
        fromStatus: 'picked_up',
        toStatus: 'on_the_way',
        timestamp: new Date().toISOString(),
      });
    }

    return delivery.toObject();
  }

  static async recordLocation(
    userId: string,
    deliveryId: string,
    input: { latitude: number; longitude: number; heading?: number; speed?: number }
  ) {
    const rider = await this.getApprovedRider(userId);
    const point = { type: 'Point' as const, coordinates: [input.longitude, input.latitude] };
    const delivery = await DeliveryModel.findOne({ _id: deliveryId, riderId: rider._id })
      .select('orderId')
      .lean();

    await Promise.all([
      RiderModel.updateOne({ _id: rider._id }, { $set: { currentLocation: point } }),
      RiderLocationModel.create({
        riderId: rider._id,
        deliveryId,
        location: point,
        heading: input.heading,
        speed: input.speed,
      }),
    ]);

    if (delivery) {
      emitRiderLocation(String(delivery.orderId), {
        deliveryId,
        lat: input.latitude,
        lng: input.longitude,
        heading: input.heading,
        speed: input.speed,
        recordedAt: new Date().toISOString(),
      });
    }

    return { recorded: true };
  }

  static async completeDelivery(
    userId: string,
    deliveryId: string,
    input: { otp: string; proofPhotoUrl?: string }
  ) {
    const rider = await this.getApprovedRider(userId);
    const delivery = await DeliveryModel.findOne({ _id: deliveryId, riderId: rider._id });
    if (!delivery || !['picked_up', 'on_the_way'].includes(delivery.status)) {
      throw new AppError(400, 'INVALID_DELIVERY_STATE', 'Delivery is not in transit');
    }

    const order = await OrderModel.findById(delivery.orderId).select('+deliveryOtpHash');
    if (!order || order.deliveryOtpHash !== hashToken(input.otp)) {
      throw new AppError(400, 'INVALID_DELIVERY_OTP', 'Invalid customer delivery OTP');
    }

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      delivery.status = 'delivered';
      delivery.otpVerifiedAt = new Date();
      delivery.deliveredAt = new Date();
      if (input.proofPhotoUrl) delivery.proofPhotoUrl = input.proofPhotoUrl;
      await delivery.save({ session });

      order.status = 'delivered';
      if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
      await order.save({ session });

      await RiderModel.updateOne(
        { _id: rider._id },
        { $inc: { completedCount: 1 } },
        { session }
      );

      // Award loyalty points (1 point per Rs. 100)
      const earnedPoints = Math.floor(order.subtotalMinor / 10_000);
      if (earnedPoints > 0) {
        const acct = await LoyaltyAccountModel.findOneAndUpdate(
          { customerId: order.customerId },
          { $inc: { pointsBalance: earnedPoints, lifetimePoints: earnedPoints } },
          { session, new: true }
        );
        if (acct) {
          await LoyaltyTransactionModel.create(
            [
              {
                loyaltyAccountId: acct._id,
                type: 'earn',
                points: earnedPoints,
                orderId: order._id,
                description: `Earned on ${order.orderNumber}`,
              },
            ],
            { session }
          );
        }
      }

      await Promise.all([
        DeliveryStatusHistoryModel.create(
          [{ deliveryId: delivery._id, status: 'delivered', changedBy: userId }],
          { session }
        ),
        OrderStatusHistoryModel.create(
          [
            {
              orderId: order._id,
              fromStatus: 'on_the_way',
              toStatus: 'delivered',
              changedBy: userId,
              role: 'rider',
            },
          ],
          { session }
        ),
      ]);
    });
    await session.endSession();
    emitOrderStatusChanged(String(delivery.orderId), String(order.customerId), {
      orderId: String(delivery.orderId),
      fromStatus: 'on_the_way',
      toStatus: 'delivered',
      timestamp: new Date().toISOString(),
    });

    return { deliveryId: String(delivery._id), status: 'delivered' };
  }

  static async getEarnings(userId: string) {
    const rider = await RiderModel.findOne({ userId }).lean();
    if (!rider) {
      return { totalMinor: 0, deliveryFeesMinor: 0, bonusesMinor: 0, tipsMinor: 0, payouts: [] };
    }
    const [deliveries, payouts] = await Promise.all([
      DeliveryModel.find({ riderId: rider._id, status: 'delivered' }).lean(),
      RiderPayoutModel.find({ riderId: rider._id }).sort({ periodEnd: -1 }).lean(),
    ]);

    const deliveryFeesMinor = deliveries.reduce((s, d) => s + d.riderEarningMinor, 0);
    const tipsMinor = deliveries.reduce((s, d) => s + d.tipMinor, 0);

    return {
      totalMinor: deliveryFeesMinor + tipsMinor,
      deliveryFeesMinor,
      bonusesMinor: 0,
      tipsMinor,
      payouts: payouts.map((p) => ({
        id: String(p._id),
        period: `${new Date(p.periodStart).toLocaleDateString()} - ${new Date(p.periodEnd).toLocaleDateString()}`,
        amountMinor: p.totalMinor,
        status: p.status,
      })),
    };
  }

  static async getHistory(userId: string) {
    const rider = await RiderModel.findOne({ userId }).lean();
    if (!rider) return [];
    const deliveries = await DeliveryModel.find({
      riderId: rider._id,
      status: { $in: ['delivered', 'cancelled'] },
    })
      .populate('orderId', 'orderNumber totalMinor paymentMethod')
      .sort({ deliveredAt: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return deliveries.map((d) => {
      const ord = d.orderId as unknown as { orderNumber?: string; totalMinor?: number; paymentMethod?: string } | null;
      const pickup = d.pickupAddressSnapshot as { name?: string } | undefined;
      const dropoff = d.dropoffAddressSnapshot as { area?: string } | undefined;
      const ts = String(d.deliveredAt ?? d.updatedAt ?? d.createdAt);
      const isDelivered = d.status === 'delivered';
      return {
        id: String(d._id),
        deliveryId: String(d._id),
        orderNumber: ord?.orderNumber ?? String(d.orderId).slice(-6).toUpperCase(),
        restaurantName: pickup?.name ?? 'Restaurant',
        area: dropoff?.area ?? 'Lahore',
        paymentMethod: ord?.paymentMethod ?? 'cod',
        earningMinor: isDelivered ? (d.riderEarningMinor ?? 0) + (d.tipMinor ?? 0) : 0,
        tipMinor: isDelivered ? d.tipMinor ?? 0 : 0,
        status: d.status as 'delivered' | 'cancelled',
        createdAt: ts,
        completedAt: ts,
      };
    });
  }

  static async getProfile(userId: string) {
    const [profile, rider] = await Promise.all([
      ProfileModel.findById(userId).lean(),
      RiderModel.findOne({ userId }).lean(),
    ]);
    if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Rider user account not found');
    return {
      userId: String(profile._id),
      fullName: profile.fullName,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      vehicleType: rider?.vehicleType ?? 'bike',
      vehicleNumber: rider?.vehicleNumber ?? '',
      licenseNumber: rider?.licenseNumber ?? '',
      cnicMasked: rider?.cnicMasked ?? '',
      status: rider?.status ?? 'pending',
      isOnline: Boolean(rider?.isOnline),
      ratingAvg: rider?.ratingAvg ?? 0,
      completedCount: rider?.completedCount ?? 0,
      payoutMethod: (rider?.payoutMethod as 'jazzcash' | 'easypaisa' | 'bank') ?? 'jazzcash',
      payoutAccountTitle: rider?.payoutAccountTitle ?? '',
      payoutAccountNumber: rider?.payoutAccountNumber ?? '',
    };
  }

  static async updateProfile(
    userId: string,
    input: {
      fullName?: string;
      phone?: string;
      vehicleType?: 'bike' | 'scooter' | 'car';
      vehicleNumber?: string;
      licenseNumber?: string;
      cnicMasked?: string;
      payoutMethod?: 'jazzcash' | 'easypaisa' | 'bank';
      payoutAccountTitle?: string;
      payoutAccountNumber?: string;
    }
  ) {
    const profilePatch: Record<string, unknown> = {};
    if (input.fullName?.trim()) profilePatch.fullName = input.fullName.trim();
    if (input.phone?.trim()) profilePatch.phone = input.phone.trim();

    const riderPatch: Record<string, unknown> = {};
    if (input.vehicleType) riderPatch.vehicleType = input.vehicleType;
    if (input.vehicleNumber !== undefined) riderPatch.vehicleNumber = input.vehicleNumber.trim();
    if (input.licenseNumber !== undefined) riderPatch.licenseNumber = input.licenseNumber.trim();
    if (input.cnicMasked !== undefined) riderPatch.cnicMasked = input.cnicMasked.trim();
    if (input.payoutMethod) riderPatch.payoutMethod = input.payoutMethod;
    if (input.payoutAccountTitle !== undefined) {
      riderPatch.payoutAccountTitle = input.payoutAccountTitle.trim();
    }
    if (input.payoutAccountNumber !== undefined) {
      riderPatch.payoutAccountNumber = input.payoutAccountNumber.trim();
    }

    await Promise.all([
      Object.keys(profilePatch).length > 0
        ? ProfileModel.findByIdAndUpdate(userId, { $set: profilePatch })
        : Promise.resolve(),
      Object.keys(riderPatch).length > 0
        ? RiderModel.findOneAndUpdate({ userId }, { $set: riderPatch })
        : Promise.resolve(),
    ]);

    return this.getProfile(userId);
  }

  static async requestPayout(userId: string, amountMinor: number) {
    const rider = await this.getApprovedRider(userId);
    if (!rider.payoutAccountNumber || rider.payoutAccountNumber.trim().length < 5) {
      throw new AppError(
        400,
        'PAYOUT_ACCOUNT_REQUIRED',
        'Save your JazzCash, Easypaisa, or Bank IBAN in Profile first'
      );
    }
    if (!Number.isFinite(amountMinor) || amountMinor < 10_000) {
      throw new AppError(400, 'INVALID_PAYOUT_AMOUNT', 'Minimum withdrawal amount is PKR 100');
    }

    const dash = await this.getDashboard(userId);
    const available = (dash as { availableBalanceMinor?: number }).availableBalanceMinor ?? 0;
    if (amountMinor > available) {
      throw new AppError(
        400,
        'INSUFFICIENT_BALANCE',
        `Requested amount exceeds available balance (PKR ${(available / 100).toFixed(0)})`
      );
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const created = await RiderPayoutModel.create({
      riderId: rider._id,
      periodStart: weekAgo,
      periodEnd: now,
      deliveryEarningsMinor: amountMinor,
      tipsMinor: 0,
      bonusesMinor: 0,
      totalMinor: amountMinor,
      status: 'pending',
    });

    return {
      id: String(created._id),
      amountMinor: created.totalMinor,
      status: created.status,
      createdAt: String(created.createdAt),
    };
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'WEAK_PASSWORD', 'New password must be at least 8 characters');
    }
    if (!currentPassword) {
      throw new AppError(400, 'CURRENT_PASSWORD_REQUIRED', 'Please enter your current password');
    }
    const profile = await ProfileModel.findById(userId).select('+passwordHash');
    if (!profile) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'Rider account not found');
    }
    const valid = await verifyPassword(currentPassword, profile.passwordHash);
    if (!valid) {
      throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    profile.passwordHash = await hashPassword(newPassword);
    await profile.save();
    return { updated: true };
  }
}
