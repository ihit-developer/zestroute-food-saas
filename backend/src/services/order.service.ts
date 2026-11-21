import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  AddressModel,
  AppSettingModel,
  CartItemCustomizationModel,
  CartItemModel,
  CartModel,
  CouponModel,
  CouponUsageModel,
  CustomerWalletModel,
  DeliveryModel,
  FoodItemModel,
  FoodRecipeModel,
  FoodStockModel,
  NotificationModel,
  OrderCancellationModel,
  OrderItemCustomizationModel,
  OrderItemModel,
  OrderModel,
  OrderStatusHistoryModel,
  PaymentModel,
  RefundModel,
  RestaurantBranchModel,
  RestaurantModel,
  ReviewModel,
  WalletTransactionModel,
} from '../models/index.js';
import { CartService } from './cart.service.js';
import { RiderService } from './rider.service.js';
import { SubscriptionService } from './subscription.service.js';
import { generateTextPdf, type PdfLine } from '../utils/pdf.js';
import { generateNumericOtp, hashToken } from '../utils/crypto.js';
import { AppError } from '../middleware/error.middleware.js';
import { emitOrderNew } from '../sockets/socketGateway.js';

export class OrderService {
  static async createOrder(
    customerId: string,
    idempotencyKey: string,
    input: {
      addressId: string;
      paymentMethod: 'cod' | 'jazzcash' | 'easypaisa' | 'card' | 'wallet';
      tipMinor: number;
      deliveryInstructions?: string;
    }
  ) {
    if (!idempotencyKey?.trim()) {
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
    }

    const existing = await OrderModel.findOne({ customerId, idempotencyKey }).lean();
    if (existing) {
      return existing;
    }

    const cart = await CartModel.findOne({ customerId });
    if (!cart) {
      throw new AppError(400, 'EMPTY_CART', 'Your cart is empty');
    }

    await CartService.recalculate(String(cart._id));
    const freshCart = await CartModel.findById(cart._id).lean();
    if (!freshCart) throw new AppError(400, 'EMPTY_CART', 'Your cart is empty');

    const [address, restaurant, branch, cartItems, settings] = await Promise.all([
      AddressModel.findOne({ _id: input.addressId, userId: customerId }).lean(),
      RestaurantModel.findOne({ _id: freshCart.restaurantId, status: 'approved' }).lean(),
      RestaurantBranchModel.findOne({ _id: freshCart.branchId, isActive: true }).lean(),
      CartItemModel.find({ cartId: freshCart._id }).lean(),
      AppSettingModel.findOne({ key: 'platform_config' }).lean(),
    ]);

    if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Delivery address not found');
    if (!restaurant || !branch || branch.isTemporarilyClosed) {
      throw new AppError(400, 'RESTAURANT_UNAVAILABLE', 'Restaurant is closed or unapproved');
    }
    const subStatus = await SubscriptionService.evaluateRestaurantSubscription(String(restaurant._id));
    if (!subStatus.isAccessAllowed) {
      throw new AppError(
        403,
        'RESTAURANT_SUBSCRIPTION_INACTIVE',
        'This restaurant is currently unavailable for online ordering.'
      );
    }
    if (cartItems.length === 0) throw new AppError(400, 'EMPTY_CART', 'Cart has no items');
    if (freshCart.subtotalMinor < branch.minOrderMinor) {
      throw new AppError(400, 'MIN_ORDER_NOT_MET', 'Subtotal is below restaurant minimum order');
    }

    const commissionBps =
      branch.commissionBpsOverride ?? restaurant.commissionBps ?? settings?.defaultCommissionBps ?? 1500;
    const commissionMinor = Math.round((freshCart.subtotalMinor * commissionBps) / 10_000);
    const restaurantNetMinor = Math.max(0, freshCart.subtotalMinor - commissionMinor);
    const totalMinor = freshCart.totalMinor + input.tipMinor;
    const deliveryOtp = generateNumericOtp(4);
    const totalCount = await OrderModel.countDocuments();
    let seq = 1001 + totalCount;
    let orderNumber = `ORD-${seq}`;
    while (await OrderModel.exists({ orderNumber })) {
      seq += 1;
      orderNumber = `ORD-${seq}`;
    }

    const session = await mongoose.startSession();
    let createdOrderId = '';

    await session.withTransaction(async () => {
      // Verify food availability & decrement recipe stock safely
      for (const item of cartItems) {
        const food = await FoodItemModel.findOne({ _id: item.foodItemId, isAvailable: true })
          .session(session)
          .lean();
        if (!food) {
          throw new AppError(400, 'FOOD_UNAVAILABLE', 'One or more items in your cart are unavailable');
        }

        const recipes = await FoodRecipeModel.find({ foodItemId: food._id }).session(session).lean();
        for (const recipe of recipes) {
          const requiredQty = recipe.quantityRequired * item.quantity;
          const updatedStock = await FoodStockModel.findOneAndUpdate(
            {
              ingredientId: recipe.ingredientId,
              branchId: branch._id,
              quantity: { $gte: requiredQty },
            },
            { $inc: { quantity: -requiredQty } },
            { session, new: true }
          );
          if (!updatedStock) {
            throw new AppError(400, 'OUT_OF_STOCK', `${food.name} is currently out of stock`);
          }
        }
      }

      if (input.paymentMethod === 'wallet') {
        const wallet = await CustomerWalletModel.findOneAndUpdate(
          { customerId, balanceMinor: { $gte: totalMinor } },
          { $inc: { balanceMinor: -totalMinor } },
          { session, new: true }
        );
        if (!wallet) {
          throw new AppError(400, 'INSUFFICIENT_WALLET', 'Insufficient wallet balance');
        }
        await WalletTransactionModel.create(
          [
            {
              walletId: wallet._id,
              type: 'debit',
              source: 'order_payment',
              amountMinor: totalMinor,
              balanceAfterMinor: wallet.balanceMinor,
              referenceId: orderNumber,
              idempotencyKey: `order-wallet-${idempotencyKey}`,
            },
          ],
          { session }
        );
      }

      const [order] = await OrderModel.create(
        [
          {
            orderNumber,
            idempotencyKey,
            customerId,
            restaurantId: restaurant._id,
            branchId: branch._id,
            deliveryAddressSnapshot: {
              fullName: address.fullName,
              phone: address.phone,
              city: address.city,
              area: address.area,
              street: address.street,
              houseNumber: address.houseNumber,
              coordinates: address.location?.coordinates ?? [0, 0],
              instructions: input.deliveryInstructions ?? address.deliveryInstructions,
            },
            status: 'pending',
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentMethod === 'wallet' ? 'paid' : 'pending',
            subtotalMinor: freshCart.subtotalMinor,
            discountMinor: freshCart.discountMinor,
            deliveryFeeMinor: freshCart.deliveryFeeMinor,
            taxMinor: freshCart.taxMinor,
            tipMinor: input.tipMinor,
            totalMinor,
            commissionBps,
            commissionMinor,
            restaurantNetMinor,
            currency: 'PKR',
            deliveryOtp,
            deliveryOtpHash: hashToken(deliveryOtp),
          },
        ],
        { session }
      );
      createdOrderId = String(order._id);

      for (const item of cartItems) {
        const food = await FoodItemModel.findById(item.foodItemId).session(session).lean();
        const addons = await CartItemCustomizationModel.find({ cartItemId: item._id })
          .populate('addonId')
          .session(session)
          .lean();

        const [orderItem] = await OrderItemModel.create(
          [
            {
              orderId: order._id,
              foodItemId: item.foodItemId,
              nameSnapshot: food?.name ?? 'Menu Item',
              quantity: item.quantity,
              unitPriceMinor: item.unitPriceMinor,
              customizationsTotalMinor: addons.reduce((s, a) => s + a.priceMinor * a.quantity, 0),
              lineTotalMinor: item.lineTotalMinor,
              specialInstructions: item.specialInstructions,
            },
          ],
          { session }
        );

        if (addons.length > 0) {
          await OrderItemCustomizationModel.insertMany(
            addons.map((a) => ({
              orderItemId: orderItem._id,
              addonId: a.addonId,
              nameSnapshot: (a.addonId as unknown as { name?: string })?.name ?? 'Add-on',
              priceMinor: a.priceMinor,
              quantity: a.quantity,
            })),
            { session }
          );
        }
      }

      await OrderStatusHistoryModel.create(
        [
          {
            orderId: order._id,
            toStatus: 'pending',
            changedBy: customerId,
            role: 'customer',
            note: 'Order placed',
          },
        ],
        { session }
      );

      await PaymentModel.create(
        [
          {
            orderId: order._id,
            customerId,
            method: input.paymentMethod,
            provider: input.paymentMethod === 'cod' ? 'cash_on_delivery' : input.paymentMethod,
            amountMinor: totalMinor,
            currency: 'PKR',
            status: input.paymentMethod === 'wallet' ? 'paid' : 'pending',
            idempotencyKey: `pay-${idempotencyKey}`,
          },
        ],
        { session }
      );

      if (freshCart.couponCode) {
        const coupon = await CouponModel.findOneAndUpdate(
          { code: freshCart.couponCode },
          { $inc: { usedCount: 1 } },
          { session }
        );
        if (coupon) {
          await CouponUsageModel.create(
            [
              {
                couponId: coupon._id,
                userId: customerId,
                orderId: order._id,
                discountMinor: freshCart.discountMinor,
              },
            ],
            { session }
          );
        }
      }

      const itemIds = cartItems.map((i) => i._id);
      await CartItemCustomizationModel.deleteMany({ cartItemId: { $in: itemIds } }).session(session);
      await CartItemModel.deleteMany({ cartId: freshCart._id }).session(session);
      await CartModel.deleteOne({ _id: freshCart._id }).session(session);
    });

    await session.endSession();
    const created = await OrderModel.findById(createdOrderId).lean();
    if (created) {
      await NotificationModel.create({
        userId: customerId,
        type: 'order_placed',
        title: `Order Placed (${created.orderNumber})`,
        body: `Your order has been sent to ${restaurant.name}. We'll notify you on every update!`,
        data: { orderId: String(created._id) },
      }).catch(() => {});
      emitOrderNew(String(restaurant._id), {
        orderId: String(created._id),
        orderNumber: created.orderNumber,
        totalMinor: created.totalMinor,
        createdAt: created.createdAt,
      });
    }
    return created;
  }

  static async listOrders(customerId: string, tab: 'active' | 'completed' | 'cancelled') {
    const statusMap = {
      active: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'on_the_way'],
      completed: ['delivered'],
      cancelled: ['cancelled', 'rejected', 'refund_pending', 'refunded'],
    };

    const orders = await OrderModel.find({
      customerId,
      status: { $in: statusMap[tab] ?? statusMap.active },
    })
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const orderIds = orders.map((o) => o._id);
    const allItems = await OrderItemModel.find({ orderId: { $in: orderIds } }).lean();
    const itemsByOrder = new Map<string, string[]>();
    const reorderItemsByOrder = new Map<
      string,
      Array<{ foodId: string; name: string; quantity: number; unitPriceMinor: number }>
    >();
    for (const item of allItems) {
      const key = String(item.orderId);
      const list = itemsByOrder.get(key) ?? [];
      list.push(`${item.quantity}x ${item.nameSnapshot}`);
      itemsByOrder.set(key, list);

      const rList = reorderItemsByOrder.get(key) ?? [];
      rList.push({
        foodId: String(item.foodItemId),
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      });
      reorderItemsByOrder.set(key, rList);
    }

    const results = [];
    for (const o of orders) {
      const isActive = !['delivered', 'cancelled', 'rejected', 'refunded'].includes(o.status);
      let deliveryOtp = o.deliveryOtp;
      if (isActive && !deliveryOtp) {
        deliveryOtp = generateNumericOtp(4);
        await OrderModel.updateOne(
          { _id: o._id },
          { $set: { deliveryOtp, deliveryOtpHash: hashToken(deliveryOtp) } }
        ).catch(() => {});
      }
      const restObj = o.restaurantId as unknown as { _id?: unknown; name?: string } | null;
      results.push({
        id: String(o._id),
        orderNumber: o.orderNumber,
        restaurantId: String(restObj?._id ?? o.restaurantId),
        restaurantName: restObj?.name ?? 'Restaurant',
        itemsSummary: (itemsByOrder.get(String(o._id)) ?? []).join(', ') || `Order ${o.orderNumber}`,
        reorderItems: reorderItemsByOrder.get(String(o._id)) ?? [],
        totalMinor: o.totalMinor,
        paymentMethod: o.paymentMethod,
        status: o.status,
        deliveryOtp: isActive ? deliveryOtp : undefined,
        createdAt: String(o.createdAt),
      });
    }
    return results;
  }

  static async getOrderDetail(customerId: string, orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    const order = await OrderModel.findOne({ _id: orderId, customerId }).lean();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    // Backfill a 4-digit delivery OTP for active orders that were created before deliveryOtp was stored
    const isActiveOrder = !['delivered', 'cancelled', 'rejected', 'refunded'].includes(order.status);
    let deliveryOtp = order.deliveryOtp;
    if (isActiveOrder && !deliveryOtp) {
      deliveryOtp = generateNumericOtp(4);
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { deliveryOtp, deliveryOtpHash: hashToken(deliveryOtp) } }
      ).catch(() => {});
    }

    const [items, history, review, refund, deliveryDoc] = await Promise.all([
      OrderItemModel.find({ orderId }).lean(),
      OrderStatusHistoryModel.find({ orderId }).sort({ createdAt: 1 }).lean(),
      ReviewModel.findOne({ orderId, customerId }).lean(),
      RefundModel.findOne({ orderId }).sort({ createdAt: -1 }).lean(),
      DeliveryModel.findOne({ orderId })
        .populate({
          path: 'riderId',
          populate: { path: 'userId', select: 'fullName phone' },
        })
        .lean(),
    ]);

    let delivery = null;
    if (deliveryDoc) {
      const rider = deliveryDoc.riderId as unknown as {
        vehicleType?: string;
        vehicleNumber?: string;
        ratingAvg?: number;
        currentLocation?: { coordinates?: [number, number] };
        userId?: { fullName?: string; phone?: string };
      } | null;
      const rCoords = rider?.currentLocation?.coordinates;
      const dCoords = order.deliveryAddressSnapshot?.coordinates as [number, number] | undefined;
      const dropLat = dCoords && dCoords[1] ? dCoords[1] : 31.5102;
      const dropLng = dCoords && dCoords[0] ? dCoords[0] : 74.3587;
      const pickupLat = 31.5204;
      const pickupLng = 74.3487;
      const hasLiveRiderCoord = Boolean(rCoords && (rCoords[0] !== 0 || rCoords[1] !== 0));
      const riderLat = hasLiveRiderCoord ? rCoords![1] : (pickupLat + dropLat) / 2;
      const riderLng = hasLiveRiderCoord ? rCoords![0] : (pickupLng + dropLng) / 2;
      const pickupSnap = deliveryDoc.pickupAddressSnapshot as { name?: string; address?: string } | undefined;

      delivery = {
        deliveryId: String(deliveryDoc._id),
        status: deliveryDoc.status,
        riderName: rider?.userId?.fullName ?? null,
        riderPhone: rider?.userId?.phone ?? null,
        vehicleType: rider?.vehicleType ?? null,
        vehicleNumber: rider?.vehicleNumber ?? null,
        riderRating: rider?.ratingAvg ?? 0,
        proofPhotoUrl: deliveryDoc.proofPhotoUrl ?? null,
        distanceKm: Number(((deliveryDoc.distanceMeters ?? 2500) / 1000).toFixed(1)),
        pickupLocation: {
          lat: pickupLat,
          lng: pickupLng,
          name: pickupSnap?.name ?? 'Restaurant Kitchen',
          address: pickupSnap?.address ?? 'Lahore',
        },
        dropoffLocation: {
          lat: dropLat,
          lng: dropLng,
          address: [
            order.deliveryAddressSnapshot?.houseNumber,
            order.deliveryAddressSnapshot?.street,
            order.deliveryAddressSnapshot?.area,
          ]
            .filter(Boolean)
            .join(', '),
        },
        riderLocation: rider
          ? {
              lat: riderLat,
              lng: riderLng,
              updatedAt: String(deliveryDoc.updatedAt),
            }
          : null,
      };
    }

    return { order: { ...order, deliveryOtp }, items, history, review, refund, delivery };
  }

  static async getOrderInvoicePdf(customerId: string, orderId: string): Promise<{ filename: string; buffer: Buffer }> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const order = await OrderModel.findOne({ _id: orderId, customerId }).lean();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    const [items, restaurant] = await Promise.all([
      OrderItemModel.find({ orderId }).lean(),
      RestaurantModel.findById(order.restaurantId).select('name').lean(),
    ]);

    const fmt = (minor: number) => `${order.currency} ${(minor / 100).toFixed(2)}`;
    const addr = order.deliveryAddressSnapshot;
    const lines: PdfLine[] = [
      { text: 'DASTARKHWAN - TAX INVOICE & ORDER RECEIPT', size: 16, bold: true, gap: 24 },
      { text: `Order Number: ${order.orderNumber}`, size: 11, bold: true },
      { text: `Date: ${new Date(order.createdAt).toISOString().slice(0, 19).replace('T', ' ')} UTC`, size: 10 },
      { text: `Restaurant: ${restaurant?.name ?? 'Dastarkhwan Partner'}`, size: 11 },
      { text: `Order Status: ${order.status.toUpperCase()}  |  Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})`, size: 10, gap: 20 },
      { text: 'DELIVERY ADDRESS', size: 11, bold: true, gap: 15 },
      { text: `${addr?.fullName ?? 'Customer'} (${addr?.phone ?? ''})`, size: 10 },
      { text: `${addr?.houseNumber ?? ''}, ${addr?.street ?? ''}, ${addr?.area ?? ''}, ${addr?.city ?? ''}`, size: 10, gap: 20 },
      { text: 'ORDER ITEMS', size: 11, bold: true, gap: 15 },
    ];

    for (const item of items) {
      const variantLabel = item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : '';
      lines.push({
        text: `${item.quantity}x ${item.nameSnapshot}${variantLabel}  -  ${fmt(item.lineTotalMinor)}`,
        size: 10,
      });
    }

    lines.push(
      { text: '------------------------------------------------------------', size: 10, gap: 16 },
      { text: `Subtotal: ${fmt(order.subtotalMinor)}`, size: 10 },
      { text: `Discount: -${fmt(order.discountMinor)}`, size: 10 },
      { text: `Delivery Fee: ${fmt(order.deliveryFeeMinor)}`, size: 10 },
      { text: `Tax: ${fmt(order.taxMinor)}`, size: 10 },
      { text: `Tip: ${fmt(order.tipMinor)}`, size: 10, gap: 18 },
      { text: `TOTAL PAID: ${fmt(order.totalMinor)}`, size: 13, bold: true, gap: 24 },
      { text: 'Thank you for ordering with Dastarkhwan.', size: 10 }
    );

    const safeOrderNo = String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, '');
    return {
      filename: `invoice-${safeOrderNo || orderId}.pdf`,
      buffer: generateTextPdf(lines),
    };
  }

  static async cancelOrder(customerId: string, orderId: string, reason: string) {
    const order = await OrderModel.findOne({ _id: orderId, customerId });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    if (['cancelled', 'rejected', 'refunded'].includes(order.status)) {
      throw new AppError(400, 'ALREADY_CLOSED', 'This order is already cancelled or refunded');
    }

    const prevStatus = order.status;
    const isPrePrep = ['pending', 'confirmed'].includes(order.status);
    order.status = isPrePrep ? 'cancelled' : 'refund_pending';
    await order.save();
    await RiderService.cancelDeliveryForOrder(String(order._id)).catch(() => {});

    let payment = await PaymentModel.findOne({ orderId: order._id }).lean();
    if (!payment) {
      payment = await PaymentModel.create({
        orderId: order._id,
        customerId: order.customerId,
        method: order.paymentMethod,
        amountMinor: order.totalMinor,
        currency: order.currency,
        status: order.paymentStatus,
      });
    }

    const existingRefund = await RefundModel.findOne({ orderId: order._id }).lean();
    await Promise.all([
      OrderStatusHistoryModel.create({
        orderId: order._id,
        fromStatus: prevStatus,
        toStatus: order.status,
        changedBy: customerId,
        role: 'customer',
        note: reason,
      }),
      OrderCancellationModel.create({
        orderId: order._id,
        cancelledBy: customerId,
        role: 'customer',
        reason,
        policyApplied: isPrePrep ? 'pre_preparation_free_cancel' : 'post_preparation_refund_request',
        refundEligible: true,
      }),
      !existingRefund
        ? RefundModel.create({
            orderId: order._id,
            paymentId: payment._id,
            customerId: order.customerId,
            amountMinor: Math.max(1, order.totalMinor),
            reason: `${isPrePrep ? 'Cancellation' : 'Refund Request'}: ${reason}`,
            status: 'requested',
          })
        : Promise.resolve(),
    ]);

    return order.toObject();
  }

  static async deleteCustomerOrder(customerId: string, orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    const deleted = await OrderModel.findOneAndDelete({ _id: orderId, customerId });
    if (!deleted) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    await Promise.all([
      OrderItemModel.deleteMany({ orderId: deleted._id }),
      OrderStatusHistoryModel.deleteMany({ orderId: deleted._id }),
      RiderService.cancelDeliveryForOrder(String(deleted._id)).catch(() => {}),
    ]);
    return { deleted: true, id: orderId };
  }
}
