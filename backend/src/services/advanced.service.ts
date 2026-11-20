import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  AppSettingModel,
  FavoriteModel,
  FoodItemModel,
  GroupOrderMemberModel,
  GroupOrderModel,
  LoyaltyAccountModel,
  LoyaltyTransactionModel,
  MembershipPlanModel,
  OrderModel,
  ScheduledOrderModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class AdvancedService {
  // Module 54: Explainable AI Food Recommendations
  static async getRecommendations(customerId: string) {
    const [pastOrders, favorites, popularFoods] = await Promise.all([
      OrderModel.find({ customerId, status: 'delivered' }).sort({ createdAt: -1 }).limit(10).lean(),
      FavoriteModel.find({ customerId }).lean(),
      FoodItemModel.find({ isAvailable: true }).sort({ orderCount: -1, ratingAvg: -1 }).limit(12).lean(),
    ]);

    const favRestIds = new Set(
      favorites.filter((f) => f.targetType === 'restaurant').map((f) => String(f.targetId))
    );
    const orderedRestIds = new Set(pastOrders.map((o) => String(o.restaurantId)));

    return popularFoods.map((food) => {
      const restId = String(food.restaurantId);
      let reason = 'Popular dish with high customer ratings';
      if (favRestIds.has(restId)) {
        reason = 'From one of your favorite restaurants';
      } else if (orderedRestIds.has(restId)) {
        reason = 'Based on your previous orders';
      }
      return {
        id: String(food._id),
        restaurantId: restId,
        name: food.name,
        regularPriceMinor: food.regularPriceMinor,
        discountPriceMinor: food.discountPriceMinor,
        rating: food.ratingAvg,
        reason,
      };
    });
  }

  // Module 55: Group Ordering
  static async createGroupOrder(
    hostCustomerId: string,
    restaurantId: string,
    branchId: string
  ) {
    const inviteCode = `GRP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const group = await GroupOrderModel.create({
      hostCustomerId,
      restaurantId,
      branchId,
      inviteCode,
      expiresAt,
    });
    await GroupOrderMemberModel.create({
      groupOrderId: group._id,
      customerId: hostCustomerId,
      items: [],
      subtotalMinor: 0,
    });
    return group;
  }

  static async getGroupOrder(inviteCode: string) {
    const group = await GroupOrderModel.findOne({ inviteCode: inviteCode.toUpperCase() }).lean();
    if (!group) throw new AppError(404, 'GROUP_ORDER_NOT_FOUND', 'Group order not found');
    const members = await GroupOrderMemberModel.find({ groupOrderId: group._id })
      .populate('customerId', 'fullName')
      .lean();
    return { group, members };
  }

  static async joinGroupOrder(inviteCode: string, customerId: string) {
    const group = await GroupOrderModel.findOne({
      inviteCode: inviteCode.toUpperCase(),
      status: 'open',
      expiresAt: { $gt: new Date() },
    });
    if (!group) throw new AppError(404, 'GROUP_ORDER_CLOSED', 'Group order is closed or expired');

    await GroupOrderMemberModel.updateOne(
      { groupOrderId: group._id, customerId },
      { $setOnInsert: { groupOrderId: group._id, customerId, items: [], subtotalMinor: 0 } },
      { upsert: true }
    );
    return this.getGroupOrder(inviteCode);
  }

  // Modules 56–57: Scheduled & Recurring Orders
  static async listScheduledOrders(customerId: string) {
    return ScheduledOrderModel.find({ customerId }).sort({ scheduledAt: 1 }).lean();
  }

  static async createScheduledOrder(
    customerId: string,
    input: {
      restaurantId: string;
      branchId: string;
      scheduleType: 'once' | 'recurring';
      cronOrDays?: string;
      scheduledAt: Date;
      itemsSnapshot: unknown[];
    }
  ) {
    if (input.scheduledAt <= new Date()) {
      throw new AppError(400, 'INVALID_SCHEDULE_TIME', 'Scheduled time must be in the future');
    }
    return ScheduledOrderModel.create({ customerId, ...input, status: 'scheduled' });
  }

  // Module 58: Membership & Loyalty
  static async listMemberships() {
    return MembershipPlanModel.find({ isActive: true }).lean();
  }

  static async getLoyalty(customerId: string) {
    const account = await LoyaltyAccountModel.findOne({ customerId }).lean();
    if (!account) return { pointsBalance: 0, lifetimePoints: 0, tier: 'bronze', transactions: [] };
    const transactions = await LoyaltyTransactionModel.find({ loyaltyAccountId: account._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return { ...account, transactions };
  }

  static async redeemPoints(customerId: string, points: number) {
    if (points <= 0) throw new AppError(400, 'INVALID_POINTS', 'Points must be positive');

    const session = await mongoose.startSession();
    let updatedBalance = 0;

    await session.withTransaction(async () => {
      const account = await LoyaltyAccountModel.findOneAndUpdate(
        { customerId, pointsBalance: { $gte: points } },
        { $inc: { pointsBalance: -points } },
        { session, new: true }
      );
      if (!account) {
        throw new AppError(400, 'INSUFFICIENT_POINTS', 'Not enough loyalty points');
      }
      updatedBalance = account.pointsBalance;
      await LoyaltyTransactionModel.create(
        [
          {
            loyaltyAccountId: account._id,
            type: 'redeem',
            points: -points,
            description: 'Redeemed loyalty points',
          },
        ],
        { session }
      );
    });
    await session.endSession();
    return { pointsBalance: updatedBalance };
  }

  // Module 60: Ramadan & Festival Mode
  static async getCampaigns() {
    const settings = await AppSettingModel.findOne({ key: 'platform_config' }).lean();
    return {
      festivalMode: settings?.festivalMode ?? 'none',
      activeCampaigns: [],
    };
  }
}
