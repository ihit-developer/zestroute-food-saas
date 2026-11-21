import mongoose from 'mongoose';
import {
  AppSettingModel,
  NotificationModel,
  RestaurantModel,
  SubscriptionPackageModel,
  SubscriptionPaymentModel,
  VendorSubscriptionModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class SubscriptionService {
  /** Ensure default SaaS packages exist if none have been created yet */
  static async ensureDefaultPackages() {
    const count = await SubscriptionPackageModel.countDocuments();
    if (count > 0) return;

    await SubscriptionPackageModel.insertMany([
      {
        name: 'Basic',
        slug: 'basic',
        description: 'Essential tools for single-branch restaurants getting started on the Website.',
        monthlyPriceMinor: 490_000, // PKR 4,900
        yearlyPriceMinor: 4_900_000, // PKR 49,000 (2 months free)
        platformAccess: 'web_only',
        features: [
          'Live Kitchen Order Management',
          'Menu & Categories Management',
          'Customer Mobile App & Web Storefront',
          'Printable Kitchen Receipts',
          'Delivery Charges Control',
        ],
        isActive: true,
        trialEligible: true,
        sortOrder: 1,
      },
      {
        name: 'Standard',
        slug: 'standard',
        description: 'Built for growing restaurants with both Website & Mobile App access.',
        monthlyPriceMinor: 890_000, // PKR 8,900
        yearlyPriceMinor: 8_900_000, // PKR 89,000
        platformAccess: 'both',
        features: [
          'Everything in Basic',
          'Multi-Branch Management',
          'Staff Accounts & Role Permissions',
          'Inventory & Stock Tracking',
          'Custom Promo Codes & Deals',
          'Customer Reviews & Replies',
        ],
        isActive: true,
        trialEligible: true,
        sortOrder: 2,
      },
      {
        name: 'Premium',
        slug: 'premium',
        description: 'Complete multi-branch Website + Mobile App enterprise suite with priority dispatch.',
        monthlyPriceMinor: 1_490_000, // PKR 14,900
        yearlyPriceMinor: 14_900_000, // PKR 149,000
        platformAccess: 'both',
        features: [
          'Everything in Standard',
          'Unlimited Branches & Staff Seats',
          'Priority Rider Dispatch & Live GPS',
          'Advanced Finance & Revenue Reports',
          'Featured Marketplace Placement',
          'Priority 24/7 Partner Support',
        ],
        isActive: true,
        trialEligible: true,
        sortOrder: 3,
      },
    ]);
  }

  static async getTrialConfig() {
    const cfg = await AppSettingModel.findOne({ key: 'platform_config' }).lean();
    const rawInstructions = cfg?.subscriptionPaymentInstructions;
    const isOldPlaceholder =
      !rawInstructions || rawInstructions.includes('0300-1234567') || rawInstructions.includes('0345-1234567');
    return {
      defaultTrialDays: cfg?.defaultTrialDays ?? 7,
      paymentInstructions: isOldPlaceholder
        ? 'Easypaisa: 0329-5931738 | JazzCash: 0329-5931738 (Dastarkhwan Admin — Send payment and enter your Transaction ID below)'
        : rawInstructions,
    };
  }

  static async updateTrialConfig(input: {
    defaultTrialDays?: number;
    paymentInstructions?: string;
  }) {
    const patch: Record<string, unknown> = {};
    if (typeof input.defaultTrialDays === 'number' && input.defaultTrialDays >= 1 && input.defaultTrialDays <= 365) {
      patch.defaultTrialDays = Math.round(input.defaultTrialDays);
    }
    if (typeof input.paymentInstructions === 'string' && input.paymentInstructions.trim()) {
      patch.subscriptionPaymentInstructions = input.paymentInstructions.trim();
    }
    await AppSettingModel.findOneAndUpdate(
      { key: 'platform_config' },
      { $set: patch },
      { upsert: true, new: true }
    );
    return this.getTrialConfig();
  }

  /** Automatically activate a free trial when a vendor registers (or backfill existing approved restaurants) */
  static async ensureTrialForRestaurant(restaurantId: string, ownerId?: string) {
    const existing = await VendorSubscriptionModel.findOne({ restaurantId });
    if (existing) return existing;

    await this.ensureDefaultPackages();
    const rest = await RestaurantModel.findById(restaurantId).select('ownerId').lean();
    const resolvedOwnerId = ownerId ?? (rest ? String(rest.ownerId) : null);
    if (!resolvedOwnerId) return null;

    const [{ defaultTrialDays }, starterPkg] = await Promise.all([
      this.getTrialConfig(),
      SubscriptionPackageModel.findOne({ isActive: true, trialEligible: true })
        .sort({ sortOrder: 1 })
        .lean(),
    ]);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + defaultTrialDays * MS_PER_DAY);

    return VendorSubscriptionModel.create({
      restaurantId,
      ownerId: resolvedOwnerId,
      packageId: starterPkg?._id,
      billingCycle: 'trial',
      status: 'trial',
      trialStartsAt: now,
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      autoRenew: false,
    }).catch(async () => VendorSubscriptionModel.findOne({ restaurantId }));
  }

  /** Real-time backend evaluation + automatic expiration enforcement (never deletes restaurant data) */
  static async evaluateRestaurantSubscription(restaurantId: string) {
    let sub = await VendorSubscriptionModel.findOne({ restaurantId }).populate('packageId');
    if (!sub) {
      sub = await this.ensureTrialForRestaurant(restaurantId);
      if (sub) await sub.populate('packageId');
    }

    if (!sub) {
      return {
        status: 'expired' as const,
        isAccessAllowed: false,
        isTrial: false,
        billingCycle: 'trial' as const,
        packageId: null as string | null,
        packageName: 'No Plan',
        features: [] as string[],
        startsAt: null as string | null,
        expiresAt: null as string | null,
        remainingDays: 0,
      };
    }

    const now = new Date();
    const expiryDate =
      sub.status === 'trial' && sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date(sub.currentPeriodEnd);

    // Automatic expiration when trial or paid period passes
    if ((sub.status === 'trial' || sub.status === 'active') && now > expiryDate) {
      sub.status = 'expired';
      await sub.save();
    }

    const remainingMs = expiryDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
    const isAccessAllowed =
      (sub.status === 'trial' || sub.status === 'active') && remainingMs > 0;

    const pkg = sub.packageId as unknown as {
      _id?: unknown;
      name?: string;
      platformAccess?: 'web_only' | 'mobile_only' | 'both';
      features?: string[];
    } | null;

    const { defaultTrialDays } = await this.getTrialConfig();
    const resolvedPlanName =
      sub.status === 'trial'
        ? `${defaultTrialDays}-Day Free Trial`
        : pkg?.name ?? 'Standard';

    return {
      id: String(sub._id),
      status: sub.status,
      isAccessAllowed,
      isTrial: sub.status === 'trial',
      billingCycle: sub.status === 'trial' ? 'trial' : sub.billingCycle,
      packageId: pkg?._id ? String(pkg._id) : null,
      packageName: resolvedPlanName,
      platformAccess: sub.status === 'trial' ? 'both' : (pkg?.platformAccess ?? 'both'),
      features: pkg?.features ?? [],
      trialStartDate: sub.trialStartsAt ? sub.trialStartsAt.toISOString() : undefined,
      trialEndDate: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : undefined,
      startsAt: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
      expiresAt: expiryDate.toISOString(),
      remainingDays,
    };
  }

  /** Fast bulk helper for customer catalog to determine which restaurants have an active subscription/trial */
  static async getActiveRestaurantIdSet(restaurantIds: string[]): Promise<Set<string>> {
    if (restaurantIds.length === 0) return new Set();
    const now = new Date();
    const subs = await VendorSubscriptionModel.find({
      restaurantId: { $in: restaurantIds },
    }).lean();

    const subMap = new Map(subs.map((s) => [String(s.restaurantId), s]));
    const activeSet = new Set<string>();

    for (const rid of restaurantIds) {
      const sub = subMap.get(rid);
      if (!sub) {
        // Auto-initialize trial for legacy seeded restaurants so existing data stays live
        const created = await this.ensureTrialForRestaurant(rid).catch(() => null);
        if (created) activeSet.add(rid);
        continue;
      }
      const exp =
        sub.status === 'trial' && sub.trialEndsAt
          ? new Date(sub.trialEndsAt)
          : new Date(sub.currentPeriodEnd);
      if ((sub.status === 'trial' || sub.status === 'active') && exp > now) {
        activeSet.add(rid);
      } else if (sub.status === 'trial' || sub.status === 'active') {
        await VendorSubscriptionModel.updateOne({ _id: sub._id }, { $set: { status: 'expired' } }).catch(
          () => {}
        );
      }
    }
    return activeSet;
  }

  /** Vendor Subscription Dashboard payload */
  static async getVendorSubscriptionOverview(restaurantId: string) {
    await this.ensureDefaultPackages();
    const [statusInfo, packages, payments, trialConfig] = await Promise.all([
      this.evaluateRestaurantSubscription(restaurantId),
      SubscriptionPackageModel.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      SubscriptionPaymentModel.find({ restaurantId })
        .populate('packageId', 'name')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      this.getTrialConfig(),
    ]);

    const pendingPayment = payments.find((p) => p.status === 'pending') ?? null;

    return {
      subscription: {
        ...statusInfo,
        displayStatus:
          !statusInfo.isAccessAllowed && pendingPayment ? 'pending_payment' : statusInfo.status,
      },
      trialConfig,
      defaultTrialDays: trialConfig.defaultTrialDays,
      paymentInstructions: trialConfig.paymentInstructions,
      packages: packages.map((p) => ({
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        monthlyPriceMinor: p.monthlyPriceMinor,
        yearlyPriceMinor: p.yearlyPriceMinor,
        platformAccess: (p.platformAccess as 'web_only' | 'mobile_only' | 'both') ?? 'both',
        features: p.features ?? [],
        isActive: p.isActive,
        trialEligible: p.trialEligible,
        isTrialEligible: p.trialEligible,
        sortOrder: p.sortOrder,
      })),
      payments: payments.map((p) => ({
        id: String(p._id),
        packageName: (p.packageId as unknown as { name?: string })?.name ?? 'Package',
        billingCycle: p.billingCycle,
        amountMinor: p.amountMinor,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        senderAccount: p.senderAccount,
        transactionRef: p.transactionRef,
        proofImageUrl: p.proofImageUrl ?? '',
        proofUrl: p.proofImageUrl ?? '',
        status: p.status,
        rejectionReason: p.rejectionReason ?? '',
        createdAt: String(p.createdAt),
        reviewedAt: p.reviewedAt ? String(p.reviewedAt) : null,
      })),
    };
  }

  /** Vendor submits subscription payment proof (Server calculates exact price — never trusts client amount) */
  static async submitVendorPayment(
    restaurantId: string,
    ownerId: string,
    input: {
      packageId: string;
      billingCycle: 'monthly' | 'yearly';
      paymentMethod: 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card';
      senderAccount?: string;
      transactionRef: string;
      proofImageUrl?: string;
      proofUrl?: string;
      notes?: string;
    }
  ) {
    if (!mongoose.Types.ObjectId.isValid(input.packageId)) {
      throw new AppError(400, 'INVALID_PACKAGE', 'Selected subscription package is invalid');
    }
    const pkg = await SubscriptionPackageModel.findOne({ _id: input.packageId, isActive: true }).lean();
    if (!pkg) {
      throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Subscription package not found or inactive');
    }
    const resolvedSender = input.senderAccount?.trim() || 'Provided via TID';
    if (!input.transactionRef?.trim() || input.transactionRef.trim().length < 4) {
      throw new AppError(400, 'INVALID_TXN_REF', 'Enter a valid Transaction Reference / TID (min 4 chars)');
    }

    const dup = await SubscriptionPaymentModel.findOne({
      transactionRef: input.transactionRef.trim(),
    }).lean();
    if (dup) {
      throw new AppError(409, 'DUPLICATE_TRANSACTION', 'This transaction reference has already been submitted');
    }

    const sub = await this.ensureTrialForRestaurant(restaurantId, ownerId);
    if (!sub) {
      throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    }

    // Server-side authoritative amount calculation
    const amountMinor =
      input.billingCycle === 'yearly' ? pkg.yearlyPriceMinor : pkg.monthlyPriceMinor;

    const payment = await SubscriptionPaymentModel.create({
      restaurantId,
      ownerId,
      subscriptionId: sub._id,
      packageId: pkg._id,
      billingCycle: input.billingCycle,
      amountMinor,
      currency: 'PKR',
      paymentMethod: input.paymentMethod,
      senderAccount: resolvedSender,
      transactionRef: input.transactionRef.trim(),
      proofImageUrl: (input.proofImageUrl || input.proofUrl)?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: 'pending',
    });

    // If subscription is currently expired, mark it pending_payment so vendor sees live verification state
    if (sub.status === 'expired') {
      sub.status = 'pending_payment';
      await sub.save();
    }

    return payment.toObject();
  }

  // ==================== SUPER ADMIN METHODS ====================

  static async listAllPackages() {
    await this.ensureDefaultPackages();
    const [list, subs] = await Promise.all([
      SubscriptionPackageModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
      VendorSubscriptionModel.find({ status: { $in: ['active', 'trial'] } })
        .populate('restaurantId', 'name')
        .populate('ownerId', 'fullName email')
        .lean(),
    ]);
    const now = new Date();
    const subscribersMap = new Map<
      string,
      Array<{
        restaurantId: string;
        restaurantName: string;
        ownerName: string;
        ownerEmail: string;
        accountType: string;
        status: string;
        remainingDays: number;
      }>
    >();
    for (const s of subs) {
      if (!s.packageId) continue;
      const key = String(s.packageId);
      const rest = s.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      const owner = s.ownerId as unknown as { fullName?: string; email?: string } | null;
      const exp =
        s.status === 'trial' && s.trialEndsAt ? new Date(s.trialEndsAt) : new Date(s.currentPeriodEnd);
      const remainingDays = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / MS_PER_DAY));
      const arr = subscribersMap.get(key) ?? [];
      arr.push({
        restaurantId: String(rest?._id ?? s.restaurantId),
        restaurantName: rest?.name ?? 'Restaurant',
        ownerName: owner?.fullName ?? 'Owner',
        ownerEmail: owner?.email ?? '',
        accountType: 'Restaurant',
        status: s.status,
        remainingDays,
      });
      subscribersMap.set(key, arr);
    }
    return list.map((p) => {
      const subscribers = subscribersMap.get(String(p._id)) ?? [];
      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        monthlyPriceMinor: p.monthlyPriceMinor,
        yearlyPriceMinor: p.yearlyPriceMinor,
        platformAccess: (p.platformAccess as 'web_only' | 'mobile_only' | 'both') ?? 'both',
        subscriberCount: subscribers.length,
        subscribers,
        features: p.features ?? [],
        isActive: p.isActive,
        trialEligible: p.trialEligible,
        sortOrder: p.sortOrder,
      };
    });
  }

  static async createPackage(input: {
    name: string;
    description?: string;
    monthlyPriceMinor: number;
    yearlyPriceMinor: number;
    platformAccess?: 'web_only' | 'mobile_only' | 'both';
    features?: string[];
    isActive?: boolean;
    trialEligible?: boolean;
    sortOrder?: number;
  }) {
    if (!input.name?.trim()) {
      throw new AppError(400, 'NAME_REQUIRED', 'Package name is required');
    }
    const slug = `${input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
    return SubscriptionPackageModel.create({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() ?? '',
      monthlyPriceMinor: Math.max(0, Math.round(input.monthlyPriceMinor)),
      yearlyPriceMinor: Math.max(0, Math.round(input.yearlyPriceMinor)),
      platformAccess: input.platformAccess ?? 'both',
      features: (input.features ?? []).map((f) => f.trim()).filter(Boolean),
      isActive: input.isActive ?? true,
      trialEligible: input.trialEligible ?? true,
      sortOrder: input.sortOrder ?? 10,
    });
  }

  static async updatePackage(
    packageId: string,
    input: Partial<{
      name: string;
      description: string;
      monthlyPriceMinor: number;
      yearlyPriceMinor: number;
      platformAccess: 'web_only' | 'mobile_only' | 'both';
      features: string[];
      isActive: boolean;
      trialEligible: boolean;
      sortOrder: number;
    }>
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (typeof input.monthlyPriceMinor === 'number') {
      patch.monthlyPriceMinor = Math.max(0, Math.round(input.monthlyPriceMinor));
    }
    if (typeof input.yearlyPriceMinor === 'number') {
      patch.yearlyPriceMinor = Math.max(0, Math.round(input.yearlyPriceMinor));
    }
    if (input.platformAccess && ['web_only', 'mobile_only', 'both'].includes(input.platformAccess)) {
      patch.platformAccess = input.platformAccess;
    }
    if (Array.isArray(input.features)) {
      patch.features = input.features.map((f) => f.trim()).filter(Boolean);
    }
    if (typeof input.isActive === 'boolean') patch.isActive = input.isActive;
    if (typeof input.trialEligible === 'boolean') patch.trialEligible = input.trialEligible;
    if (typeof input.sortOrder === 'number') patch.sortOrder = input.sortOrder;

    const updated = await SubscriptionPackageModel.findByIdAndUpdate(
      packageId,
      { $set: patch },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Subscription package not found');
    return updated;
  }

  static async deletePackage(packageId: string) {
    const deleted = await SubscriptionPackageModel.findByIdAndDelete(packageId).lean();
    if (!deleted) throw new AppError(404, 'PACKAGE_NOT_FOUND', 'Subscription package not found');
    return { deleted: true, id: packageId };
  }

  static async getAdminOverview() {
    await this.ensureDefaultPackages();
    const restaurants = await RestaurantModel.find().select('_id ownerId name status createdAt').lean();

    // Ensure every restaurant has a subscription document and refresh expired statuses
    for (const r of restaurants) {
      await this.evaluateRestaurantSubscription(String(r._id)).catch(() => {});
    }

    const [subs, payments, trialConfig, packages] = await Promise.all([
      VendorSubscriptionModel.find()
        .populate('restaurantId', 'name status')
        .populate('ownerId', 'fullName email phone')
        .populate('packageId', 'name')
        .sort({ currentPeriodEnd: 1 })
        .lean(),
      SubscriptionPaymentModel.find()
        .populate('restaurantId', 'name')
        .populate('ownerId', 'fullName email')
        .populate('packageId', 'name')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      this.getTrialConfig(),
      this.listAllPackages(),
    ]);

    const now = new Date();
    const formattedSubs = subs.map((s) => {
      const rest = s.restaurantId as unknown as { _id?: unknown; name?: string; status?: string } | null;
      const owner = s.ownerId as unknown as { fullName?: string; email?: string; phone?: string } | null;
      const pkg = s.packageId as unknown as { _id?: unknown; name?: string } | null;
      const exp =
        s.status === 'trial' && s.trialEndsAt ? new Date(s.trialEndsAt) : new Date(s.currentPeriodEnd);
      const remainingDays = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / MS_PER_DAY));
      const isAccessAllowed = (s.status === 'trial' || s.status === 'active') && exp > now;
      const resolvedPkgName =
        s.status === 'trial'
          ? `${trialConfig.defaultTrialDays}-Day Free Trial`
          : pkg?.name ?? 'Standard';
      const resolvedCycle = s.status === 'trial' ? 'trial' : s.billingCycle;
      return {
        id: String(s._id),
        restaurantId: String(rest?._id ?? s.restaurantId),
        restaurantName: rest?.name ?? 'Restaurant',
        ownerName: owner?.fullName ?? 'Partner',
        ownerEmail: owner?.email ?? '',
        packageId: pkg?._id ? String(pkg._id) : null,
        packageName: resolvedPkgName,
        billingCycle: resolvedCycle,
        status: s.status,
        isAccessAllowed,
        startsAt: String(s.currentPeriodStart),
        expiresAt: exp.toISOString(),
        remainingDays,
      };
    });

    const formattedPayments = payments.map((p) => {
      const rest = p.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      const owner = p.ownerId as unknown as { fullName?: string; email?: string } | null;
      const pkg = p.packageId as unknown as { name?: string } | null;
      return {
        id: String(p._id),
        restaurantId: String(rest?._id ?? p.restaurantId),
        restaurantName: rest?.name ?? 'Restaurant',
        ownerName: owner?.fullName ?? 'Partner',
        ownerEmail: owner?.email ?? '',
        packageName: pkg?.name ?? 'Plan',
        billingCycle: p.billingCycle,
        amountMinor: p.amountMinor,
        paymentMethod: p.paymentMethod,
        senderAccount: p.senderAccount,
        transactionRef: p.transactionRef,
        proofImageUrl: p.proofImageUrl ?? '',
        proofUrl: p.proofImageUrl ?? '',
        notes: p.notes ?? '',
        status: p.status,
        rejectionReason: p.rejectionReason ?? '',
        createdAt: String(p.createdAt),
      };
    });

    const approvedPayments = formattedPayments.filter((p) => p.status === 'approved');
    const pendingPaymentsCount = formattedPayments.filter((p) => p.status === 'pending').length;
    const monthlyRevenueMinor = approvedPayments
      .filter((p) => p.billingCycle === 'monthly')
      .reduce((sum, p) => sum + p.amountMinor, 0);
    const yearlyRevenueMinor = approvedPayments
      .filter((p) => p.billingCycle === 'yearly')
      .reduce((sum, p) => sum + p.amountMinor, 0);

    return {
      metrics: {
        totalVendors: formattedSubs.length,
        activeVendors: formattedSubs.filter((s) => s.status === 'active').length,
        trialVendors: formattedSubs.filter((s) => s.status === 'trial').length,
        expiredVendors: formattedSubs.filter(
          (s) => s.status === 'expired' || s.status === 'pending_payment' || s.status === 'suspended'
        ).length,
        suspendedVendors: formattedSubs.filter((s) => s.status === 'suspended').length,
        pendingPayments: pendingPaymentsCount,
        pendingPaymentsCount,
        approvedPayments: approvedPayments.length,
        rejectedPayments: formattedPayments.filter((p) => p.status === 'rejected').length,
        monthlyRevenueMinor,
        yearlyRevenueMinor,
        totalRevenueMinor: monthlyRevenueMinor + yearlyRevenueMinor,
        totalSubscriptionRevenueMinor: monthlyRevenueMinor + yearlyRevenueMinor,
      },
      trialConfig,
      packages,
      vendorSubscriptions: formattedSubs,
      subscriptions: formattedSubs,
      payments: formattedPayments,
      upcomingExpirations: formattedSubs.filter(
        (s) => (s.status === 'trial' || s.status === 'active') && s.remainingDays <= 7
      ),
    };
  }

  /** Super Admin approves or rejects a vendor subscription payment */
  static async reviewPayment(
    paymentId: string,
    adminId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) {
    const payment = await SubscriptionPaymentModel.findById(paymentId).populate('packageId', 'name');
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Subscription payment not found');
    if (payment.status !== 'pending') {
      throw new AppError(400, 'ALREADY_REVIEWED', 'This payment has already been reviewed');
    }

    const sub = await VendorSubscriptionModel.findById(payment.subscriptionId);
    if (!sub) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Vendor subscription record not found');

    const now = new Date();
    payment.status = decision;
    payment.reviewedBy = new mongoose.Types.ObjectId(adminId);
    payment.reviewedAt = now;
    if (decision === 'rejected' && rejectionReason?.trim()) {
      payment.rejectionReason = rejectionReason.trim();
    }
    await payment.save();

    const pkgName = (payment.packageId as unknown as { name?: string })?.name ?? 'Subscription';

    if (decision === 'approved') {
      const durationDays = payment.billingCycle === 'yearly' ? 365 : 30;
      // Preserve remaining days when renewing early!
      const baseStart =
        sub.status === 'active' && new Date(sub.currentPeriodEnd) > now
          ? new Date(sub.currentPeriodEnd)
          : now;
      const newEnd = new Date(baseStart.getTime() + durationDays * MS_PER_DAY);

      sub.packageId = payment.packageId._id;
      sub.billingCycle = payment.billingCycle;
      sub.status = 'active';
      if (baseStart === now) sub.currentPeriodStart = now;
      sub.currentPeriodEnd = newEnd;
      await sub.save();

      await NotificationModel.create({
        userId: payment.ownerId,
        type: 'subscription_activated',
        title: `${pkgName} Subscription Activated!`,
        body: `Your ${payment.billingCycle} plan is now active until ${newEnd.toLocaleDateString()}.`,
        data: { restaurantId: String(payment.restaurantId), status: 'active' },
      }).catch(() => {});
    } else {
      if (sub.status === 'pending_payment') {
        sub.status = 'expired';
        await sub.save();
      }
      await NotificationModel.create({
        userId: payment.ownerId,
        type: 'subscription_rejected',
        title: 'Subscription Payment Rejected',
        body: rejectionReason?.trim() || 'Your payment submission could not be verified. Please resubmit.',
        data: { restaurantId: String(payment.restaurantId), status: 'rejected' },
      }).catch(() => {});
    }

    return { payment: payment.toObject(), subscription: sub.toObject() };
  }

  /** Super Admin full direct control: assign plan, renew freely for friends, set exact expiry, suspend, or end immediately */
  static async adminUpdateVendorSubscription(
    restaurantId: string,
    input: {
      status?: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
      extendDays?: number;
      setDaysFromNow?: number;
      expiresAt?: string;
      packageId?: string;
      billingCycle?: 'trial' | 'monthly' | 'yearly';
      endImmediately?: boolean;
      grantFreeAccess?: boolean;
    }
  ) {
    const sub = await this.ensureTrialForRestaurant(restaurantId);
    if (!sub) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');

    const now = new Date();
    if (input.packageId && mongoose.Types.ObjectId.isValid(input.packageId)) {
      sub.packageId = new mongoose.Types.ObjectId(input.packageId);
    }
    if (input.billingCycle) {
      sub.billingCycle = input.billingCycle;
    }

    if (input.endImmediately || input.status === 'expired') {
      const past = new Date(now.getTime() - 1000);
      sub.status = 'expired';
      sub.currentPeriodEnd = past;
      if (sub.trialEndsAt) sub.trialEndsAt = past;
      await sub.save();
      return sub.toObject();
    }

    if (input.expiresAt) {
      const customEnd = new Date(input.expiresAt);
      if (!Number.isNaN(customEnd.getTime())) {
        sub.currentPeriodEnd = customEnd;
        if (input.status === 'trial' || sub.status === 'trial') {
          sub.trialEndsAt = customEnd;
        }
      }
    } else if (typeof input.setDaysFromNow === 'number' && input.setDaysFromNow > 0) {
      const nextEnd = new Date(now.getTime() + input.setDaysFromNow * MS_PER_DAY);
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = nextEnd;
      if (input.status === 'trial' || sub.status === 'trial') {
        sub.trialEndsAt = nextEnd;
      }
    } else if (typeof input.extendDays === 'number' && input.extendDays > 0) {
      const currentExp =
        sub.status === 'trial' && sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date(sub.currentPeriodEnd);
      const base = currentExp > now ? currentExp : now;
      const nextEnd = new Date(base.getTime() + input.extendDays * MS_PER_DAY);
      sub.currentPeriodEnd = nextEnd;
      if (sub.status === 'trial' && input.status !== 'active') {
        sub.trialEndsAt = nextEnd;
      }
      if (sub.status === 'expired' || sub.status === 'pending_payment' || sub.status === 'suspended') {
        sub.status = 'active';
      }
    }

    if (input.grantFreeAccess) {
      sub.status = 'active';
      if (!input.billingCycle) {
        const totalDays = input.setDaysFromNow ?? input.extendDays ?? 30;
        sub.billingCycle = totalDays >= 365 ? 'yearly' : 'monthly';
      }
      if (new Date(sub.currentPeriodEnd) <= now) {
        sub.currentPeriodEnd = new Date(now.getTime() + 30 * MS_PER_DAY);
      }
    } else if (input.status) {
      sub.status = input.status;
      if (input.status === 'active' && new Date(sub.currentPeriodEnd) <= now) {
        sub.currentPeriodEnd = new Date(now.getTime() + 30 * MS_PER_DAY);
      }
      if (input.status === 'trial') {
        const { defaultTrialDays } = await this.getTrialConfig();
        if (!sub.trialEndsAt || new Date(sub.trialEndsAt) <= now) {
          const tEnd = new Date(now.getTime() + defaultTrialDays * MS_PER_DAY);
          sub.trialStartsAt = now;
          sub.trialEndsAt = tEnd;
          sub.currentPeriodEnd = tEnd;
        }
      }
    }

    await sub.save();
    return sub.toObject();
  }
}
