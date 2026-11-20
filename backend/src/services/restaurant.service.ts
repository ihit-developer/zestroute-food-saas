import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  CouponModel,
  FoodImageModel,
  FoodItemModel,
  FoodStockModel,
  IngredientModel,
  NotificationModel,
  OrderItemModel,
  OrderModel,
  OrderStatusHistoryModel,
  ProfileModel,
  RestaurantBranchModel,
  RestaurantCategoryModel,
  RestaurantModel,
  RestaurantPayoutModel,
  RestaurantStaffModel,
  RestaurantStaffPermissionModel,
  ReviewModel,
  UserRoleModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { emitOrderStatusChanged } from '../sockets/socketGateway.js';
import { RiderService } from './rider.service.js';
import { hashPassword } from '../utils/crypto.js';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['preparing'],
  preparing: ['ready_for_pickup'],
};

export class RestaurantService {
  static async listMine(userId: string) {
    const owned = await RestaurantModel.find({ ownerId: userId }).sort({ createdAt: 1 }).lean();
    if (owned.length > 0) {
      return owned.map((r) => ({
        id: String(r._id),
        name: r.name,
        status: r.status,
      }));
    }
    const staffLinks = await RestaurantStaffModel.find({ userId, isActive: true }).lean();
    if (staffLinks.length === 0) return [];
    const staffed = await RestaurantModel.find({
      _id: { $in: staffLinks.map((s) => s.restaurantId) },
    }).lean();
    return staffed.map((r) => ({
      id: String(r._id),
      name: r.name,
      status: r.status,
    }));
  }

  static async apply(
    ownerId: string,
    input: {
      name: string;
      description?: string;
      cuisineTypes: string[];
      address: string;
      city: string;
      area: string;
      latitude: number;
      longitude: number;
      bankAccountTitle: string;
      bankIbanMasked: string;
    }
  ) {
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto
      .randomBytes(2)
      .toString('hex')}`;

    const session = await mongoose.startSession();
    let restaurantId = '';
    await session.withTransaction(async () => {
      const [rest] = await RestaurantModel.create(
        [
          {
            ownerId,
            name: input.name,
            slug,
            description: input.description,
            cuisineTypes: input.cuisineTypes,
            bankAccountTitle: input.bankAccountTitle,
            bankIbanMasked: input.bankIbanMasked,
            status: 'pending',
          },
        ],
        { session }
      );
      restaurantId = String(rest._id);

      await RestaurantBranchModel.create(
        [
          {
            restaurantId: rest._id,
            name: `${input.name} - Main Branch`,
            address: input.address,
            city: input.city,
            area: input.area,
            location: { type: 'Point', coordinates: [input.longitude, input.latitude] },
          },
        ],
        { session }
      );
    });
    await session.endSession();
    return RestaurantModel.findById(restaurantId).lean();
  }

  static async getDashboardMetrics(restaurantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [orders, restaurant] = await Promise.all([
      OrderModel.find({ restaurantId }).lean(),
      RestaurantModel.findById(restaurantId).select('ratingAvg').lean(),
    ]);

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfDay);
    const delivered = orders.filter((o) => o.status === 'delivered');

    return {
      todayOrders: todayOrders.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      acceptedOrders: orders.filter((o) => ['confirmed', 'preparing', 'ready_for_pickup'].includes(o.status)).length,
      completedOrders: delivered.length,
      cancelledOrders: orders.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length,
      todaySalesMinor: todayOrders.reduce((s, o) => s + o.subtotalMinor, 0),
      weeklySalesMinor: delivered.reduce((s, o) => s + o.subtotalMinor, 0),
      monthlySalesMinor: delivered.reduce((s, o) => s + o.subtotalMinor, 0),
      totalEarningsMinor: delivered.reduce((s, o) => s + o.restaurantNetMinor, 0),
      platformCommissionMinor: delivered.reduce((s, o) => s + o.commissionMinor, 0),
      averageRating: restaurant?.ratingAvg ?? 0,
      bestSellingFood: '—',
      dailySalesSeries: [],
      monthlyRevenueSeries: [],
    };
  }

  static async listOrders(restaurantId: string, statusTab?: string) {
    const filter: Record<string, unknown> = { restaurantId };
    if (statusTab && statusTab !== 'all') {
      const statusMap: Record<string, string | { $in: string[] }> = {
        new: 'pending',
        pending: 'pending',
        accepted: 'confirmed',
        confirmed: 'confirmed',
        preparing: 'preparing',
        ready: { $in: ['ready_for_pickup', 'rider_assigned', 'picked_up', 'on_the_way'] },
        ready_for_pickup: 'ready_for_pickup',
        completed: 'delivered',
        delivered: 'delivered',
        rejected: 'rejected',
        cancelled: { $in: ['cancelled', 'refund_pending', 'refunded'] },
      };
      filter.status = statusMap[statusTab] ?? statusTab;
    }

    const [orders, restaurant] = await Promise.all([
      OrderModel.find(filter)
        .populate('customerId', 'fullName phone')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      RestaurantModel.findById(restaurantId).select('name').lean(),
    ]);

    const orderIds = orders.map((o) => o._id);
    const allItems = await OrderItemModel.find({ orderId: { $in: orderIds } }).lean();
    const itemsByOrder = new Map<
      string,
      Array<{
        name: string;
        variantName?: string;
        quantity: number;
        unitPriceMinor: number;
        lineTotalMinor: number;
      }>
    >();
    for (const item of allItems) {
      const key = String(item.orderId);
      const list = itemsByOrder.get(key) ?? [];
      list.push({
        name: item.nameSnapshot,
        variantName: item.variantNameSnapshot ?? undefined,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        lineTotalMinor: item.lineTotalMinor,
      });
      itemsByOrder.set(key, list);
    }

    return orders.map((o) => {
      const items = itemsByOrder.get(String(o._id)) ?? [];
      const addr = o.deliveryAddressSnapshot;
      const customer = o.customerId as unknown as { fullName?: string; phone?: string };
      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        restaurantName: restaurant?.name ?? 'ZestRoute Kitchen',
        customerName: addr?.fullName ?? customer?.fullName ?? 'Customer',
        customerPhone: addr?.phone ?? customer?.phone ?? '',
        deliveryAddress: addr
          ? [addr.houseNumber, addr.street, addr.area, addr.city].filter(Boolean).join(', ')
          : '',
        deliveryInstructions: addr?.instructions ?? '',
        items,
        itemsSummary:
          items.map((i) => `${i.quantity}x ${i.name}`).join(', ') || `${o.currency} Order`,
        subtotalMinor: o.subtotalMinor,
        discountMinor: o.discountMinor ?? 0,
        deliveryFeeMinor: o.deliveryFeeMinor ?? 0,
        taxMinor: o.taxMinor ?? 0,
        tipMinor: o.tipMinor ?? 0,
        totalMinor: o.totalMinor,
        currency: o.currency,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: String(o.createdAt),
      };
    });
  }

  static async createManualOrder(
    restaurantId: string,
    actorId: string,
    input: {
      customerName: string;
      customerPhone?: string;
      deliveryAddress?: string;
      foodItemId?: string;
      itemName?: string;
      quantity?: number;
      unitPriceMinor?: number;
      paymentMethod?: 'cod' | 'card' | 'jazzcash' | 'easypaisa' | 'wallet';
    }
  ) {
    const [restaurant, branch] = await Promise.all([
      RestaurantModel.findById(restaurantId).lean(),
      RestaurantBranchModel.findOne({ restaurantId }).sort({ createdAt: 1 }).lean(),
    ]);
    if (!restaurant || !branch) {
      throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant or branch not found');
    }

    let food = input.foodItemId
      ? await FoodItemModel.findOne({ _id: input.foodItemId, restaurantId }).lean()
      : await FoodItemModel.findOne({ restaurantId }).lean();
    if (!food) {
      throw new AppError(400, 'FOOD_REQUIRED', 'Please add at least one food item to your menu first');
    }

    const qty = Math.max(1, Number(input.quantity) || 1);
    const unitPrice = input.unitPriceMinor ?? food.discountPriceMinor ?? food.regularPriceMinor;
    const subtotalMinor = unitPrice * qty;
    const deliveryFeeMinor = branch.deliveryFeeMinor ?? 12000;
    const totalMinor = subtotalMinor + deliveryFeeMinor;
    const commissionBps = restaurant.commissionBps ?? 1500;
    const commissionMinor = Math.round((subtotalMinor * commissionBps) / 10_000);
    const restaurantNetMinor = Math.max(0, subtotalMinor - commissionMinor);

    const totalCount = await OrderModel.countDocuments();
    let seq = 1001 + totalCount;
    let orderNumber = `ORD-${seq}`;
    while (await OrderModel.exists({ orderNumber })) {
      seq += 1;
      orderNumber = `ORD-${seq}`;
    }

    const order = await OrderModel.create({
      orderNumber,
      idempotencyKey: `manual-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      customerId: actorId,
      restaurantId: restaurant._id,
      branchId: branch._id,
      deliveryAddressSnapshot: {
        fullName: input.customerName.trim() || 'Walk-in Customer',
        phone: input.customerPhone?.trim() || '03000000000',
        city: branch.city || 'Lahore',
        area: branch.area || 'Main',
        street: input.deliveryAddress?.trim() || branch.address || 'Counter Pickup',
        houseNumber: '—',
        coordinates: branch.location?.coordinates ?? [74.3587, 31.5204],
      },
      status: 'pending',
      paymentMethod: input.paymentMethod ?? 'cod',
      paymentStatus: 'pending',
      subtotalMinor,
      discountMinor: 0,
      deliveryFeeMinor,
      taxMinor: 0,
      tipMinor: 0,
      totalMinor,
      commissionBps,
      commissionMinor,
      restaurantNetMinor,
      currency: 'PKR',
    });

    await OrderItemModel.create({
      orderId: order._id,
      foodItemId: food._id,
      nameSnapshot: input.itemName?.trim() || food.name,
      quantity: qty,
      unitPriceMinor: unitPrice,
      customizationsTotalMinor: 0,
      lineTotalMinor: subtotalMinor,
    });

    return order;
  }

  static async updateOrderDetails(
    restaurantId: string,
    orderId: string,
    input: {
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
      status?: string;
    }
  ) {
    const patch: Record<string, unknown> = {};
    if (input.customerName !== undefined) patch['deliveryAddressSnapshot.fullName'] = input.customerName.trim();
    if (input.customerPhone !== undefined) patch['deliveryAddressSnapshot.phone'] = input.customerPhone.trim();
    if (input.deliveryAddress !== undefined) patch['deliveryAddressSnapshot.street'] = input.deliveryAddress.trim();
    if (input.paymentStatus !== undefined) patch.paymentStatus = input.paymentStatus;
    if (input.status !== undefined) patch.status = input.status;

    const updated = await OrderModel.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { $set: patch },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return updated;
  }

  static async deleteOrder(restaurantId: string, orderId: string) {
    const deleted = await OrderModel.findOneAndDelete({ _id: orderId, restaurantId });
    if (!deleted) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    await Promise.all([
      OrderItemModel.deleteMany({ orderId: deleted._id }),
      OrderStatusHistoryModel.deleteMany({ orderId: deleted._id }),
    ]);
    return { deleted: true, id: orderId };
  }

  static async transitionOrderStatus(
    restaurantId: string,
    orderId: string,
    actorId: string,
    nextStatus: 'confirmed' | 'preparing' | 'ready_for_pickup' | 'delivered' | 'rejected',
    note?: string
  ) {
    const restaurant = await RestaurantModel.findById(restaurantId).select('status').lean();
    if (!restaurant || restaurant.status !== 'approved') {
      throw new AppError(403, 'RESTAURANT_NOT_APPROVED', 'Only approved restaurants can process orders');
    }

    const order = await OrderModel.findOne({ _id: orderId, restaurantId });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        400,
        'INVALID_ORDER_TRANSITION',
        `Cannot transition order from ${order.status} to ${nextStatus}`
      );
    }

    const prevStatus = order.status;
    order.status = nextStatus;
    await order.save();

    if (['confirmed', 'preparing', 'ready_for_pickup'].includes(nextStatus)) {
      await RiderService.ensureDeliveryForOrder(String(order._id)).catch(() => {});
    } else if (nextStatus === 'rejected') {
      await RiderService.cancelDeliveryForOrder(String(order._id)).catch(() => {});
    }

    await OrderStatusHistoryModel.create({
      orderId: order._id,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      changedBy: actorId,
      role: 'restaurant_owner',
      note,
    });

    emitOrderStatusChanged(String(order._id), String(order.customerId), {
      orderId: String(order._id),
      fromStatus: prevStatus,
      toStatus: nextStatus,
      timestamp: new Date().toISOString(),
    });

    const statusTitles: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: `Order Accepted (${order.orderNumber})`,
        body: 'The kitchen has accepted your order!',
      },
      preparing: {
        title: `Preparing Your Food (${order.orderNumber})`,
        body: 'Your meal is being cooked fresh right now.',
      },
      ready_for_pickup: {
        title: `Order Ready (${order.orderNumber})`,
        body: 'Your order is packed and ready for dispatch.',
      },
      delivered: {
        title: `Order Delivered (${order.orderNumber})`,
        body: 'Your order has arrived. Enjoy your meal & leave a review!',
      },
      rejected: {
        title: `Order Rejected (${order.orderNumber})`,
        body: note || 'Sorry, the restaurant could not fulfill this order.',
      },
    };
    const notif = statusTitles[nextStatus];
    if (notif) {
      await NotificationModel.create({
        userId: order.customerId,
        type: 'order_status',
        title: notif.title,
        body: notif.body,
        data: { orderId: String(order._id), status: nextStatus },
      }).catch(() => {});
    }

    return order.toObject();
  }

  static async createCategory(restaurantId: string, input: { name: string; sortOrder: number }) {
    return RestaurantCategoryModel.create({ restaurantId, ...input });
  }

  static async listCategories(restaurantId: string) {
    const cats = await RestaurantCategoryModel.find({ restaurantId }).sort({ sortOrder: 1 }).lean();
    return cats.map((c) => ({
      id: String(c._id),
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    }));
  }

  static async createFoodItem(restaurantId: string, input: Record<string, unknown>) {
    const { imageUrl, ...rest } = input;
    const food = await FoodItemModel.create({ restaurantId, ...rest });
    if (typeof imageUrl === 'string' && imageUrl.trim()) {
      await FoodImageModel.create({
        foodItemId: food._id,
        url: imageUrl.trim(),
        isPrimary: true,
        sortOrder: 0,
      });
    }
    return food;
  }

  static async updateFoodItem(
    restaurantId: string,
    foodId: string,
    input: Record<string, unknown>
  ) {
    const { imageUrl, ...rest } = input;
    const food = await FoodItemModel.findOneAndUpdate(
      { _id: foodId, restaurantId },
      { $set: rest },
      { new: true }
    );
    if (!food) throw new AppError(404, 'FOOD_NOT_FOUND', 'Food item not found');
    if (typeof imageUrl === 'string' && imageUrl.trim()) {
      await FoodImageModel.findOneAndUpdate(
        { foodItemId: food._id, isPrimary: true },
        { $set: { url: imageUrl.trim(), isPrimary: true, sortOrder: 0 } },
        { upsert: true }
      );
    }
    return food;
  }

  static async deleteFoodItem(restaurantId: string, foodId: string) {
    const deleted = await FoodItemModel.findOneAndDelete({ _id: foodId, restaurantId });
    if (!deleted) throw new AppError(404, 'FOOD_NOT_FOUND', 'Food item not found');
    await FoodImageModel.deleteMany({ foodItemId: deleted._id });
    return { deleted: true, id: foodId };
  }

  static async listFoodItems(restaurantId: string) {
    const foods = await FoodItemModel.find({ restaurantId })
      .populate('restaurantCategoryId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const images = await FoodImageModel.find({
      foodItemId: { $in: foods.map((f) => f._id) },
    })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();
    const imageMap = new Map<string, string>();
    for (const img of images) {
      const key = String(img.foodItemId);
      if (!imageMap.has(key)) imageMap.set(key, img.url);
    }
    return foods.map((f) => ({
      id: String(f._id),
      name: f.name,
      description: f.description ?? '',
      categoryName:
        (f.restaurantCategoryId as unknown as { name?: string })?.name ?? 'Menu',
      regularPriceMinor: f.regularPriceMinor,
      discountPriceMinor: f.discountPriceMinor ?? 0,
      prepTimeMins: f.prepTimeMins ?? 15,
      stockQuantity: 25,
      isAvailable: f.isAvailable,
      imageUrl: imageMap.get(String(f._id)) ?? '',
    }));
  }

  static async listInventory(restaurantId: string) {
    const ingredients = await IngredientModel.find({ restaurantId }).sort({ createdAt: -1 }).lean();
    const stocks = await FoodStockModel.find({
      ingredientId: { $in: ingredients.map((i) => i._id) },
    }).lean();
    return ingredients.map((ing) => {
      const st = stocks.find((s) => String(s.ingredientId) === String(ing._id));
      const quantity = st?.quantity ?? 0;
      const threshold = ing.lowStockThreshold ?? 5;
      return {
        id: String(ing._id),
        name: ing.name,
        category: ing.category ?? 'Kitchen Essentials',
        unit: ing.unit,
        quantity,
        purchasePriceMinor: ing.purchasePriceMinor,
        totalValueMinor: Math.round(quantity * ing.purchasePriceMinor),
        supplierName: ing.supplierName ?? '—',
        lowStockThreshold: threshold,
        lowStock: quantity <= threshold,
        imageUrl: ing.imageUrl ?? '',
        notes: ing.notes ?? '',
        lastRestockedAt: st?.lastRestockedAt ? String(st.lastRestockedAt) : String(ing.updatedAt),
      };
    });
  }

  static async updateStock(
    restaurantId: string,
    input: { ingredientId: string; branchId: string; quantity: number }
  ) {
    if (input.quantity < 0) {
      throw new AppError(400, 'NEGATIVE_STOCK_FORBIDDEN', 'Stock quantity cannot be negative');
    }
    const ingredient = await IngredientModel.findOne({ _id: input.ingredientId, restaurantId }).lean();
    if (!ingredient) throw new AppError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');

    return FoodStockModel.findOneAndUpdate(
      { ingredientId: input.ingredientId, branchId: input.branchId },
      { $set: { quantity: input.quantity, lastRestockedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();
  }

  static async addStaff(
    restaurantId: string,
    input: {
      userId?: string;
      fullName?: string;
      email?: string;
      password?: string;
      branchId?: string;
      title: string;
      permissions: string[];
    }
  ) {
    let targetUserId = input.userId;
    const rawPassword = input.password?.trim() || 'StaffPass#2026!';
    if (!targetUserId && input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      let profile = await ProfileModel.findOne({ email: normalizedEmail });
      const passwordHash = await hashPassword(rawPassword);
      if (!profile) {
        profile = await ProfileModel.create({
          fullName: input.fullName?.trim() || 'Restaurant Staff',
          email: normalizedEmail,
          passwordHash,
          accountStatus: 'active',
        });
      } else if (input.password?.trim()) {
        profile.passwordHash = passwordHash;
        await profile.save();
      }
      targetUserId = String(profile._id);
      await UserRoleModel.updateOne(
        { userId: profile._id, role: 'restaurant_staff' },
        { $setOnInsert: { userId: profile._id, role: 'restaurant_staff' } },
        { upsert: true }
      );
    }
    if (!targetUserId) {
      throw new AppError(400, 'STAFF_USER_REQUIRED', 'Staff email or userId is required');
    }

    const staff = await RestaurantStaffModel.create({
      restaurantId,
      branchId: input.branchId,
      userId: targetUserId,
      title: input.title,
    });
    await RestaurantStaffPermissionModel.create({
      staffId: staff._id,
      permissions: input.permissions,
    });
    return staff;
  }

  static async updateStaff(
    restaurantId: string,
    staffId: string,
    input: { title?: string; permissions?: string[] }
  ) {
    const staff = await RestaurantStaffModel.findOneAndUpdate(
      { _id: staffId, restaurantId },
      { $set: input.title ? { title: input.title.trim() } : {} },
      { new: true }
    );
    if (!staff) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    if (Array.isArray(input.permissions) && input.permissions.length > 0) {
      await RestaurantStaffPermissionModel.findOneAndUpdate(
        { staffId: staff._id },
        { $set: { permissions: input.permissions } },
        { upsert: true }
      );
    }
    return staff;
  }

  static async deleteStaff(restaurantId: string, staffId: string) {
    const deleted = await RestaurantStaffModel.findOneAndDelete({ _id: staffId, restaurantId });
    if (!deleted) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    await RestaurantStaffPermissionModel.deleteMany({ staffId: deleted._id });
    return { deleted: true, id: staffId };
  }

  static async updateCategory(
    restaurantId: string,
    categoryId: string,
    input: { name?: string; sortOrder?: number; isActive?: boolean }
  ) {
    const updated = await RestaurantCategoryModel.findOneAndUpdate(
      { _id: categoryId, restaurantId },
      { $set: input },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Menu category not found');
    return updated;
  }

  static async deleteCategory(restaurantId: string, categoryId: string) {
    const deleted = await RestaurantCategoryModel.findOneAndDelete({ _id: categoryId, restaurantId });
    if (!deleted) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Menu category not found');
    return { deleted: true, id: categoryId };
  }

  static async createIngredient(
    restaurantId: string,
    input: {
      name: string;
      category?: string;
      unit: string;
      quantity: number;
      purchasePriceMinor?: number;
      supplierName?: string;
      lowStockThreshold?: number;
      imageUrl?: string;
      notes?: string;
    }
  ) {
    const validUnits = ['g', 'kg', 'ml', 'l', 'pcs'] as const;
    const rawUnit = String(input.unit ?? 'kg').trim().toLowerCase();
    const safeUnit = (validUnits as readonly string[]).includes(rawUnit) ? rawUnit : 'kg';

    const ing = await IngredientModel.create({
      restaurantId,
      name: input.name.trim(),
      category: input.category?.trim() || 'Kitchen Essentials',
      unit: safeUnit,
      purchasePriceMinor: Math.max(0, Number(input.purchasePriceMinor) || 0),
      supplierName: input.supplierName?.trim() || undefined,
      lowStockThreshold: Math.max(0, Number(input.lowStockThreshold) || 5),
      imageUrl: input.imageUrl?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    });
    const branch = await RestaurantBranchModel.findOne({ restaurantId }).select('_id').lean();
    if (branch) {
      await FoodStockModel.create({
        ingredientId: ing._id,
        branchId: branch._id,
        quantity: Math.max(0, Number(input.quantity) || 0),
        lastRestockedAt: new Date(),
      });
    }
    return ing;
  }

  static async updateIngredient(
    restaurantId: string,
    ingredientId: string,
    input: {
      name?: string;
      category?: string;
      unit?: string;
      quantity?: number;
      purchasePriceMinor?: number;
      supplierName?: string;
      lowStockThreshold?: number;
      imageUrl?: string;
      notes?: string;
    }
  ) {
    const { quantity, unit, ...rest } = input;
    const fields: Record<string, unknown> = { ...rest };
    if (unit !== undefined) {
      const validUnits = ['g', 'kg', 'ml', 'l', 'pcs'] as const;
      const rawUnit = String(unit).trim().toLowerCase();
      fields.unit = (validUnits as readonly string[]).includes(rawUnit) ? rawUnit : 'kg';
    }
    const ing = await IngredientModel.findOneAndUpdate(
      { _id: ingredientId, restaurantId },
      { $set: fields },
      { new: true }
    ).lean();
    if (!ing) throw new AppError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');
    if (typeof quantity === 'number' && quantity >= 0) {
      const branch = await RestaurantBranchModel.findOne({ restaurantId }).select('_id').lean();
      if (branch) {
        await FoodStockModel.findOneAndUpdate(
          { ingredientId: ing._id, branchId: branch._id },
          { $set: { quantity, lastRestockedAt: new Date() } },
          { upsert: true }
        );
      }
    }
    return ing;
  }

  static async deleteIngredient(restaurantId: string, ingredientId: string) {
    const deleted = await IngredientModel.findOneAndDelete({ _id: ingredientId, restaurantId });
    if (!deleted) throw new AppError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');
    await FoodStockModel.deleteMany({ ingredientId: deleted._id });
    return { deleted: true, id: ingredientId };
  }

  static async listPromotions(restaurantId: string) {
    const list = await CouponModel.find({ restaurantId }).sort({ createdAt: -1 }).lean();
    return list.map((c) => ({
      id: String(c._id),
      title: c.code,
      type: `${c.discountType} (${c.discountType === 'fixed' ? `PKR ${c.value / 100}` : `${c.value}%`})`,
      validity: `${new Date(c.startsAt).toLocaleDateString()} - ${new Date(c.expiresAt).toLocaleDateString()}`,
      isActive: c.isActive,
    }));
  }

  static async createPromotion(
    restaurantId: string,
    input: {
      title: string;
      discountType?: 'percent' | 'fixed' | 'free_delivery';
      value?: number;
      startsAt?: string;
      expiresAt?: string;
    }
  ) {
    const code = input.title.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24) || `PROMO${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const startsAt = input.startsAt ? new Date(input.startsAt) : now;
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return CouponModel.create({
      code,
      scope: 'restaurant',
      restaurantId,
      discountType: input.discountType ?? 'percent',
      value: Math.max(0, input.value ?? 15),
      minOrderMinor: 0,
      startsAt,
      expiresAt,
      isActive: true,
    });
  }

  static async updatePromotion(
    restaurantId: string,
    promoId: string,
    input: { isActive?: boolean; value?: number }
  ) {
    const updated = await CouponModel.findOneAndUpdate(
      { _id: promoId, restaurantId },
      { $set: input },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'PROMO_NOT_FOUND', 'Promotion not found');
    return updated;
  }

  static async deletePromotion(restaurantId: string, promoId: string) {
    const deleted = await CouponModel.findOneAndDelete({ _id: promoId, restaurantId });
    if (!deleted) throw new AppError(404, 'PROMO_NOT_FOUND', 'Promotion not found');
    return { deleted: true, id: promoId };
  }

  static async listBranches(restaurantId: string) {
    const list = await RestaurantBranchModel.find({ restaurantId }).sort({ createdAt: 1 }).lean();
    return list.map((b) => ({
      id: String(b._id),
      name: b.name,
      cityArea: `${b.city}, ${b.area}`,
      street: b.address ?? '',
      hours: `${b.prepTimeMins ?? 25} min prep · ${Math.round((b.deliveryRadiusMeters ?? 8000) / 1000)} km`,
      isActive: b.isActive && !b.isTemporarilyClosed,
    }));
  }

  static async createBranch(
    restaurantId: string,
    input: {
      name: string;
      city?: string;
      area?: string;
      street?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    return RestaurantBranchModel.create({
      restaurantId,
      name: input.name,
      city: input.city?.trim() || 'Lahore',
      area: input.area?.trim() || 'Main',
      address: input.street?.trim() || 'Main Boulevard',
      location: {
        type: 'Point',
        coordinates: [Number(input.longitude) || 74.3587, Number(input.latitude) || 31.5204],
      },
      isActive: true,
    });
  }

  static async updateBranch(
    restaurantId: string,
    branchId: string,
    input: { name?: string; city?: string; area?: string; street?: string; isActive?: boolean }
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.city !== undefined) patch.city = input.city;
    if (input.area !== undefined) patch.area = input.area;
    if (input.street !== undefined) patch.address = input.street;
    if (input.isActive !== undefined) {
      patch.isActive = input.isActive;
      patch.isTemporarilyClosed = !input.isActive;
    }
    const updated = await RestaurantBranchModel.findOneAndUpdate(
      { _id: branchId, restaurantId },
      { $set: patch },
      { new: true }
    ).lean();
    if (!updated) throw new AppError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    return updated;
  }

  static async deleteBranch(restaurantId: string, branchId: string) {
    const deleted = await RestaurantBranchModel.findOneAndDelete({ _id: branchId, restaurantId });
    if (!deleted) throw new AppError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    return { deleted: true, id: branchId };
  }

  static async getProfile(restaurantId: string) {
    const [rest, branch] = await Promise.all([
      RestaurantModel.findById(restaurantId).lean(),
      RestaurantBranchModel.findOne({ restaurantId }).sort({ createdAt: 1 }).lean(),
    ]);
    if (!rest) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    return {
      id: String(rest._id),
      name: rest.name,
      description: rest.description ?? '',
      phone: branch?.phone ?? '',
      logoUrl: rest.logoUrl ?? '',
      coverImageUrl: rest.coverUrl ?? '',
      deliveryRadiusKm: Math.round((branch?.deliveryRadiusMeters ?? 8000) / 1000),
      minOrderMinor: branch?.minOrderMinor ?? 30000,
      deliveryFeeMinor: branch?.deliveryFeeMinor ?? 12000,
      chargeDeliveryFee: (branch?.deliveryFeeMinor ?? 12000) > 0,
      defaultPrepTimeMins: branch?.prepTimeMins ?? 25,
      isAcceptingOrders: branch ? !branch.isTemporarilyClosed : true,
    };
  }

  static async updateProfile(restaurantId: string, input: Record<string, unknown>) {
    const restPatch: Record<string, unknown> = {};
    if (typeof input.name === 'string' && input.name.trim()) restPatch.name = input.name.trim();
    if (typeof input.description === 'string') restPatch.description = input.description.trim();
    if (typeof input.logoUrl === 'string') restPatch.logoUrl = input.logoUrl.trim();
    if (typeof input.coverImageUrl === 'string') restPatch.coverUrl = input.coverImageUrl.trim();

    if (Object.keys(restPatch).length > 0) {
      const updated = await RestaurantModel.findByIdAndUpdate(
        restaurantId,
        { $set: restPatch },
        { new: true }
      ).lean();
      if (!updated) throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    }

    const branchPatch: Record<string, unknown> = {};
    if (typeof input.phone === 'string') branchPatch.phone = input.phone.trim();
    if (typeof input.deliveryRadiusKm === 'number') {
      branchPatch.deliveryRadiusMeters = Math.max(500, Math.round(input.deliveryRadiusKm * 1000));
    }
    if (typeof input.minOrderMinor === 'number') {
      branchPatch.minOrderMinor = Math.max(0, input.minOrderMinor);
    }
    if (typeof input.deliveryFeeMinor === 'number') {
      branchPatch.deliveryFeeMinor = Math.max(0, Math.round(input.deliveryFeeMinor));
    }
    if (typeof input.defaultPrepTimeMins === 'number') {
      branchPatch.prepTimeMins = Math.max(5, input.defaultPrepTimeMins);
    }
    if (typeof input.isAcceptingOrders === 'boolean') {
      branchPatch.isTemporarilyClosed = !input.isAcceptingOrders;
    }

    if (Object.keys(branchPatch).length > 0) {
      await RestaurantBranchModel.updateMany({ restaurantId }, { $set: branchPatch });
    }

    return this.getProfile(restaurantId);
  }

  static async listStaff(restaurantId: string) {
    const staffList = await RestaurantStaffModel.find({ restaurantId })
      .populate('userId', 'fullName email')
      .lean();
    const perms = await RestaurantStaffPermissionModel.find({
      staffId: { $in: staffList.map((s) => s._id) },
    }).lean();

    return staffList.map((s) => ({
      id: String(s._id),
      fullName: (s.userId as unknown as { fullName?: string })?.fullName ?? 'Staff',
      email: (s.userId as unknown as { email?: string })?.email ?? '',
      title: s.title,
      permissions: perms.find((p) => String(p.staffId) === String(s._id))?.permissions ?? [],
    }));
  }

  static async listReviews(restaurantId: string) {
    const list = await ReviewModel.find({ restaurantId })
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();
    return list.map((r) => ({
      id: String(r._id),
      customerName: (r.customerId as unknown as { fullName?: string })?.fullName ?? 'Customer',
      restaurantRating: r.restaurantRating ?? 5,
      foodRating: r.foodRating ?? 5,
      comment: r.comment ?? '',
      ownerReply: r.ownerReply ?? undefined,
    }));
  }

  static async replyToReview(restaurantId: string, reviewId: string, ownerReply: string) {
    const review = await ReviewModel.findOneAndUpdate(
      { _id: reviewId, restaurantId },
      { $set: { ownerReply, ownerRepliedAt: new Date() } },
      { new: true }
    ).lean();
    if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    await NotificationModel.create({
      userId: review.customerId,
      type: 'review_reply',
      title: 'Restaurant Replied to Your Review',
      body: ownerReply,
      data: { orderId: String(review.orderId) },
    }).catch(() => {});
    return review;
  }

  static async getFinancials(restaurantId: string) {
    const [orders, payouts] = await Promise.all([
      OrderModel.find({ restaurantId }).sort({ createdAt: -1 }).limit(100).lean(),
      RestaurantPayoutModel.find({ restaurantId }).sort({ periodEnd: -1 }).lean(),
    ]);

    const orderRows = orders.map((o) => ({
      id: String(o._id),
      reference: o.orderNumber,
      grossMinor: o.totalMinor,
      commissionMinor: o.commissionMinor,
      netMinor: o.restaurantNetMinor,
      status: o.status === 'delivered' ? 'settled' : o.status,
      date: new Date(o.createdAt).toLocaleDateString(),
    }));

    const payoutRows = payouts.map((p) => ({
      id: `payout-${String(p._id)}`,
      reference: `PAYOUT-${String(p._id).slice(-6).toUpperCase()}`,
      grossMinor: p.grossMinor,
      commissionMinor: p.commissionMinor,
      netMinor: p.netMinor,
      status: p.status,
      date: new Date(p.periodEnd).toLocaleDateString(),
    }));

    return [...payoutRows, ...orderRows];
  }
}
