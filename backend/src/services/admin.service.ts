import mongoose from 'mongoose';
import {
  AppSettingModel,
  AuditLogModel,
  CategoryModel,
  ComplaintModel,
  CouponModel,
  CustomerWalletModel,
  NotificationModel,
  OrderModel,
  PaymentModel,
  ProfileModel,
  PromotionalBannerModel,
  RefundModel,
  RestaurantBranchModel,
  RestaurantModel,
  RestaurantPayoutModel,
  RiderModel,
  RiderPayoutModel,
  UserRoleModel,
  WalletTransactionModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class AdminService {
  static async getDashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalRestaurants,
      pendingRestaurantApps,
      totalRiders,
      pendingRiderApps,
      orders,
      pendingPayouts,
      refundRequestsCount,
      recentOrdersRaw,
    ] = await Promise.all([
      UserRoleModel.countDocuments({ role: 'customer' }),
      RestaurantModel.countDocuments({ status: 'approved' }),
      RestaurantModel.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      RiderModel.countDocuments({ status: 'approved' }),
      RiderModel.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      OrderModel.find().select('status totalMinor commissionMinor createdAt').lean(),
      RestaurantPayoutModel.find({ status: 'pending' }).select('netMinor').lean(),
      RefundModel.countDocuments({ status: 'requested' }),
      OrderModel.find()
        .populate('restaurantId', 'name')
        .populate('customerId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfDay).length;
    const completed = orders.filter((o) => o.status === 'delivered');
    const nonCancelled = orders.filter((o) => !['cancelled', 'rejected', 'refunded'].includes(o.status));

    // Build real 7-day revenue & order series from MongoDB orders
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const revenueSeries: Array<{ label: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayOrders = nonCancelled.filter((o) => {
        const dt = new Date(o.createdAt);
        return dt >= d && dt < nextD;
      });

      const dayRevenuePkr = Math.round(
        dayOrders.reduce((sum, o) => sum + (o.totalMinor ?? 0), 0) / 100
      );
      revenueSeries.push({
        label: i === 0 ? 'Today' : `${dayNames[d.getDay()]} ${d.getDate()}`,
        revenue: dayRevenuePkr,
        orders: dayOrders.length,
      });
    }

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      restaurant: (o.restaurantId as unknown as { name?: string })?.name ?? 'Restaurant',
      customer: (o.customerId as unknown as { fullName?: string })?.fullName ?? 'Customer',
      totalMinor: o.totalMinor,
      status: o.status,
      createdAt: String(o.createdAt),
    }));

    return {
      totalCustomers,
      totalRestaurants,
      pendingRestaurantApps,
      totalRiders,
      pendingRiderApps,
      totalOrders: orders.length,
      todayOrders,
      pendingOrders: orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(o.status)).length,
      completedOrders: completed.length,
      cancelledOrders: orders.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length,
      grossOrderValueMinor: nonCancelled.reduce((s, o) => s + (o.totalMinor ?? 0), 0),
      platformRevenueMinor: nonCancelled.reduce((s, o) => s + (o.commissionMinor ?? 0), 0),
      totalCommissionsMinor: nonCancelled.reduce((s, o) => s + (o.commissionMinor ?? 0), 0),
      pendingPayoutsMinor: pendingPayouts.reduce((s, p) => s + (p.netMinor ?? 0), 0),
      refundRequestsCount,
      revenueSeries,
      recentOrders,
    };
  }

  static async listCustomers() {
    const roles = await UserRoleModel.find({ role: 'customer' }).select('userId').lean();
    const profiles = await ProfileModel.find({ _id: { $in: roles.map((r) => r.userId) } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return profiles.map((p) => ({
      id: String(p._id),
      fullName: p.fullName,
      email: p.email ?? '',
      phone: p.phone ?? '',
      status: p.accountStatus,
    }));
  }

  static async setAccountStatus(userId: string, accountStatus: 'active' | 'suspended') {
    const updated = await ProfileModel.findByIdAndUpdate(
      userId,
      { $set: { accountStatus } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');
    return updated;
  }

  static async updateCustomer(userId: string, input: { fullName?: string; phone?: string; accountStatus?: 'active' | 'suspended' }) {
    const patch: Record<string, unknown> = {};
    if (input.fullName?.trim()) patch.fullName = input.fullName.trim();
    if (input.phone !== undefined) patch.phone = input.phone.trim();
    if (input.accountStatus) patch.accountStatus = input.accountStatus;
    const updated = await ProfileModel.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'USER_NOT_FOUND', 'Customer not found');
    return updated;
  }

  static async deleteCustomer(userId: string) {
    const deleted = await ProfileModel.findByIdAndDelete(userId).lean();
    if (!deleted) throw new AppError(404, 'USER_NOT_FOUND', 'Customer not found');
    await UserRoleModel.deleteMany({ userId }).catch(() => {});
    return { deleted: true, id: userId };
  }

  static async updateRestaurant(
    restaurantId: string,
    input: { name?: string; description?: string; commissionBps?: number; status?: 'approved' | 'suspended' | 'pending' | 'rejected' }
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name?.trim()) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (typeof input.commissionBps === 'number') patch.commissionBps = Math.max(0, Math.min(5000, Math.round(input.commissionBps)));
    if (input.status) patch.status = input.status;
    const updated = await RestaurantModel.findByIdAndUpdate(restaurantId, { $set: patch }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    return updated;
  }

  static async deleteRestaurant(restaurantId: string) {
    const deleted = await RestaurantModel.findByIdAndDelete(restaurantId).lean();
    if (!deleted) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    await RestaurantBranchModel.deleteMany({ restaurantId }).catch(() => {});
    return { deleted: true, id: restaurantId };
  }

  static async updateOrderStatusAdmin(orderId: string, status: string) {
    const updated = await OrderModel.findByIdAndUpdate(orderId, { $set: { status } }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return updated;
  }

  static async deleteOrderAdmin(orderId: string) {
    const deleted = await OrderModel.findByIdAndDelete(orderId).lean();
    if (!deleted) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return { deleted: true, id: orderId };
  }

  static async listRestaurants(statusFilter?: string) {
    const filter =
      statusFilter === 'directory'
        ? { status: { $in: ['approved', 'suspended'] } }
        : statusFilter === 'applications'
          ? { status: { $in: ['pending', 'under_review', 'rejected'] } }
          : statusFilter
            ? { status: statusFilter }
            : {};

    const list = await RestaurantModel.find(filter)
      .populate('ownerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return list.map((r) => {
      const owner = r.ownerId as unknown as { fullName?: string; email?: string; phone?: string } | null;
      return {
        id: String(r._id),
        name: r.name,
        ownerName: owner?.fullName ?? 'Partner Owner',
        ownerEmail: owner?.email ?? '',
        city: r.cuisineTypes.join(', ') || 'Multi-Cuisine',
        commissionPct: Number(((r.commissionBps ?? 1500) / 100).toFixed(1)),
        ratingAvg: r.ratingAvg ?? 0,
        status: r.status,
        submittedAt: String(r.createdAt),
      };
    });
  }

  static async reviewRestaurant(
    restaurantId: string,
    status: 'approved' | 'rejected' | 'suspended' | 'under_review'
  ) {
    const updated = await RestaurantModel.findByIdAndUpdate(
      restaurantId,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    return updated;
  }

  static async listRiders(statusFilter?: string) {
    const filter =
      statusFilter === 'directory'
        ? { status: { $in: ['approved', 'suspended'] } }
        : statusFilter === 'applications'
          ? { status: { $in: ['pending', 'under_review', 'rejected'] } }
          : statusFilter
            ? { status: statusFilter }
            : {};

    const list = await RiderModel.find(filter)
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return list.map((r) => {
      const u = r.userId as unknown as { fullName?: string; email?: string; phone?: string } | null;
      return {
        id: String(r._id),
        fullName: u?.fullName ?? 'Rider',
        name: u?.fullName ?? 'Rider',
        email: u?.email ?? '',
        phone: u?.phone ?? '',
        city: r.vehicleType,
        isOnline: Boolean(r.isOnline),
        status: r.status,
        submittedAt: String(r.createdAt),
      };
    });
  }

  static async reviewRider(
    riderId: string,
    status: 'approved' | 'rejected' | 'suspended' | 'under_review'
  ) {
    const updated = await RiderModel.findByIdAndUpdate(
      riderId,
      { $set: { status, ...(status !== 'approved' ? { isOnline: false } : {}) } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'RIDER_NOT_FOUND', 'Rider not found');
    return updated;
  }

  static async listOrders() {
    const orders = await OrderModel.find()
      .populate('restaurantId', 'name')
      .populate('customerId', 'fullName phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return orders.map((o) => {
      const customerDoc = o.customerId as unknown as { fullName?: string; phone?: string } | null;
      const hasRider = ['rider_assigned', 'picked_up', 'on_the_way', 'delivered'].includes(o.status);
      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        restaurant: (o.restaurantId as unknown as { name?: string })?.name ?? 'Restaurant',
        customer: customerDoc?.fullName ?? 'Customer',
        rider: hasRider ? 'Assigned Rider' : 'Unassigned',
        paymentMethod: o.paymentMethod ?? 'cod',
        totalMinor: o.totalMinor,
        status: o.status,
        createdAt: String(o.createdAt),
      };
    });
  }

  static async listCategories() {
    const cats = await CategoryModel.find().sort({ sortOrder: 1 }).lean();
    return cats.map((c) => ({
      id: String(c._id),
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    }));
  }

  static async createCategory(input: { name: string; nameUr?: string; slug: string; sortOrder: number }) {
    return CategoryModel.create({ ...input, isActive: true });
  }

  static async updateCategory(id: string, input: { name?: string; nameUr?: string; sortOrder?: number; isActive?: boolean }) {
    const updated = await CategoryModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    return updated;
  }

  static async deleteCategory(id: string) {
    const deleted = await CategoryModel.findByIdAndDelete(id).lean();
    if (!deleted) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    return { deleted: true, id };
  }

  static async listCoupons() {
    const list = await CouponModel.find().sort({ createdAt: -1 }).lean();
    return list.map((c) => ({
      id: String(c._id),
      title: c.code,
      detail: `${c.discountType} (${c.value}) • Used ${c.usedCount}`,
      status: c.isActive ? 'Active' : 'Inactive',
    }));
  }

  static async createCoupon(input: Record<string, unknown>) {
    return CouponModel.create(input);
  }

  static async updateCoupon(id: string, input: { isActive?: boolean; value?: number; usageLimit?: number }) {
    const updated = await CouponModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    return updated;
  }

  static async deleteCoupon(id: string) {
    const deleted = await CouponModel.findByIdAndDelete(id).lean();
    if (!deleted) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found');
    return { deleted: true, id };
  }

  static async listBanners() {
    const list = await PromotionalBannerModel.find().sort({ sortOrder: 1 }).lean();
    return list.map((b) => ({
      id: String(b._id),
      title: b.title,
      detail: `${new Date(b.startsAt).toLocaleDateString()} - ${new Date(b.endsAt).toLocaleDateString()}`,
      status: b.isActive ? 'Active' : 'Inactive',
    }));
  }

  static async createBanner(input: Record<string, unknown>) {
    return PromotionalBannerModel.create(input);
  }

  static async updateBanner(id: string, input: { title?: string; isActive?: boolean; targetUrl?: string }) {
    const updated = await PromotionalBannerModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
    if (!updated) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found');
    return updated;
  }

  static async deleteBanner(id: string) {
    const deleted = await PromotionalBannerModel.findByIdAndDelete(id).lean();
    if (!deleted) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found');
    return { deleted: true, id };
  }

  static async updateRestaurantCommission(restaurantId: string, commissionBps: number) {
    const updated = await RestaurantModel.findByIdAndUpdate(
      restaurantId,
      { $set: { commissionBps } },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    return updated;
  }

  static async listPayments() {
    const list = await PaymentModel.find()
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return list.map((p) => {
      const ord = p.orderId as unknown as { orderNumber?: string } | null;
      return {
        id: String(p._id),
        title: ord?.orderNumber ?? String(p.orderId),
        detail: `${p.method.toUpperCase()} • PKR ${(p.amountMinor / 100).toLocaleString()}`,
        amountMinor: p.amountMinor,
        status: p.status,
      };
    });
  }

  static async listRiderPayouts() {
    const list = await RiderPayoutModel.find()
      .populate({
        path: 'riderId',
        populate: { path: 'userId', select: 'fullName phone email' },
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return list.map((p) => {
      const rider = p.riderId as unknown as {
        payoutMethod?: string;
        payoutAccountTitle?: string;
        payoutAccountNumber?: string;
        userId?: { fullName?: string; phone?: string };
      } | null;
      return {
        id: String(p._id),
        riderName: rider?.userId?.fullName ?? 'Rider',
        riderPhone: rider?.userId?.phone ?? '',
        payoutMethod: (rider?.payoutMethod ?? 'jazzcash').toUpperCase(),
        accountTitle: rider?.payoutAccountTitle || rider?.userId?.fullName || '—',
        accountNumber: rider?.payoutAccountNumber || 'Not set',
        amountMinor: p.totalMinor,
        status: p.status,
        createdAt: String(p.createdAt),
      };
    });
  }

  static async processRiderPayout(payoutId: string, status: 'paid' | 'failed') {
    const payout = await RiderPayoutModel.findById(payoutId).populate('riderId', 'userId');
    if (!payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'Rider payout request not found');
    if (payout.status === 'paid') {
      throw new AppError(400, 'ALREADY_PAID', 'This payout has already been marked paid');
    }

    payout.status = status;
    if (status === 'paid') payout.paidAt = new Date();
    await payout.save();

    const riderDoc = payout.riderId as unknown as { userId?: unknown } | null;
    if (riderDoc?.userId) {
      await NotificationModel.create({
        userId: riderDoc.userId,
        type: 'payout_update',
        title: status === 'paid' ? 'Payout Sent!' : 'Payout Request Declined',
        body:
          status === 'paid'
            ? `PKR ${(payout.totalMinor / 100).toLocaleString()} has been transferred to your payout account.`
            : `Your payout request of PKR ${(payout.totalMinor / 100).toLocaleString()} was declined and returned to your balance.`,
        data: { payoutId: String(payout._id), status },
      }).catch(() => {});
    }

    return payout.toObject();
  }

  static async listRefunds() {
    const list = await RefundModel.find()
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return list.map((r) => {
      const ord = r.orderId as unknown as { orderNumber?: string; _id?: unknown };
      return {
        id: String(r._id),
        title: ord?.orderNumber ?? String(r.orderId),
        detail: `${r.reason} · PKR ${(r.amountMinor / 100).toFixed(2)}`,
        status: r.status,
      };
    });
  }

  static async processRefund(
    refundId: string,
    adminId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ) {
    const refund = await RefundModel.findById(refundId);
    if (!refund || refund.status !== 'requested') {
      throw new AppError(400, 'REFUND_NOT_ELIGIBLE', 'Refund request not found or already processed');
    }

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      refund.status = status === 'approved' ? 'processed' : 'rejected';
      refund.reviewedBy = new mongoose.Types.ObjectId(adminId);
      if (adminNotes) refund.adminNotes = adminNotes;
      await refund.save({ session });

      if (status === 'approved') {
        const wallet = await CustomerWalletModel.findOneAndUpdate(
          { customerId: refund.customerId },
          { $inc: { balanceMinor: refund.amountMinor } },
          { session, new: true, upsert: true }
        );
        await WalletTransactionModel.create(
          [
            {
              walletId: wallet._id,
              type: 'credit',
              source: 'refund',
              amountMinor: refund.amountMinor,
              balanceAfterMinor: wallet.balanceMinor,
              referenceId: String(refund.orderId),
              idempotencyKey: `refund-${refund._id}`,
            },
          ],
          { session }
        );
        await OrderModel.findByIdAndUpdate(
          refund.orderId,
          { $set: { status: 'refunded', paymentStatus: 'refunded' } },
          { session }
        );
      }
    });
    await session.endSession();
    await NotificationModel.create({
      userId: refund.customerId,
      type: 'refund_update',
      title: status === 'approved' ? 'Refund Approved & Credited!' : 'Refund Request Update',
      body:
        status === 'approved'
          ? `PKR ${(refund.amountMinor / 100).toFixed(2)} has been credited to your Dastarkhwan Wallet.`
          : adminNotes || 'Your refund request was reviewed by our team.',
      data: { orderId: String(refund.orderId) },
    }).catch(() => {});
    return refund.toObject();
  }

  static async listComplaints() {
    const list = await ComplaintModel.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return list.map((c) => {
      const u = c.userId as unknown as { fullName?: string; email?: string } | null;
      return {
        id: String(c._id),
        actor: u?.fullName ? `${u.fullName} (${u.email ?? ''})` : String(c.userId),
        action: c.type,
        resource: c.againstRole,
        timestamp: new Date(c.createdAt).toLocaleString(),
      };
    });
  }

  static async listAuditLogs() {
    const list = await AuditLogModel.find().sort({ createdAt: -1 }).limit(150).lean();
    return list.map((l) => ({
      id: String(l._id),
      actor: `${l.actorRole} (${String(l.actorId).slice(-6)})`,
      action: l.action,
      resource: `${l.resourceType}:${l.resourceId}`,
      timestamp: new Date(l.createdAt).toLocaleString(),
    }));
  }

  static async getSettings() {
    const doc = await AppSettingModel.findOne({ key: 'platform_config' }).lean();
    return (
      doc ?? {
        key: 'platform_config',
        appName: 'Dastarkhwan',
        taxBps: 0,
        minOrderMinor: 30000,
        defaultCommissionBps: 1500,
        baseDeliveryFeeMinor: 12000,
      }
    );
  }

  static async updateSettings(input: Record<string, unknown>) {
    return AppSettingModel.findOneAndUpdate(
      { key: 'platform_config' },
      { $set: input },
      { new: true, upsert: true }
    ).lean();
  }
}
