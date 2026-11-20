import {
  AppSettingModel,
  CartItemCustomizationModel,
  CartItemModel,
  CartModel,
  CouponModel,
  FoodAddonModel,
  FoodItemModel,
  FoodVariantModel,
  RestaurantBranchModel,
  RestaurantModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class CartService {
  static async getCart(customerId: string) {
    const cart = await CartModel.findOne({ customerId }).lean();
    if (!cart) {
      return { cart: null, items: [] };
    }
    const items = await CartItemModel.find({ cartId: cart._id }).populate('foodItemId').lean();
    const itemIds = items.map((i) => i._id);
    const customizations = await CartItemCustomizationModel.find({
      cartItemId: { $in: itemIds },
    })
      .populate('addonId')
      .lean();

    return {
      cart,
      items: items.map((item) => ({
        ...item,
        customizations: customizations.filter(
          (c) => String(c.cartItemId) === String(item._id)
        ),
      })),
    };
  }

  static async addItem(
    customerId: string,
    input: {
      foodItemId: string;
      branchId: string;
      variantId?: string;
      quantity: number;
      addons: Array<{ addonId: string; quantity: number }>;
      specialInstructions?: string;
      replaceCart: boolean;
    }
  ) {
    const food = await FoodItemModel.findById(input.foodItemId).lean();
    if (!food || !food.isAvailable) {
      throw new AppError(400, 'FOOD_UNAVAILABLE', 'This food item is currently unavailable');
    }

    const [restaurant, branch] = await Promise.all([
      RestaurantModel.findOne({ _id: food.restaurantId, status: 'approved' }).lean(),
      RestaurantBranchModel.findOne({
        _id: input.branchId,
        restaurantId: food.restaurantId,
        isActive: true,
      }).lean(),
    ]);

    if (!restaurant || !branch || branch.isTemporarilyClosed) {
      throw new AppError(400, 'RESTAURANT_CLOSED', 'Restaurant branch is closed or unavailable');
    }

    let cart = await CartModel.findOne({ customerId });
    if (cart && String(cart.restaurantId) !== String(restaurant._id)) {
      if (!input.replaceCart) {
        throw new AppError(
          409,
          'CART_RESTAURANT_CONFLICT',
          'Your cart has items from another restaurant. Confirm to replace your cart.'
        );
      }
      await this.clearCart(customerId);
      cart = null;
    }

    if (!cart) {
      cart = await CartModel.create({
        customerId,
        restaurantId: restaurant._id,
        branchId: branch._id,
        currency: 'PKR',
      });
    }

    // Server-side price calculation (never trust client prices)
    let unitPriceMinor = food.discountPriceMinor ?? food.regularPriceMinor;
    if (input.variantId) {
      const variant = await FoodVariantModel.findOne({
        _id: input.variantId,
        foodItemId: food._id,
        isAvailable: true,
      }).lean();
      if (!variant) {
        throw new AppError(400, 'INVALID_VARIANT', 'Selected food variant is unavailable');
      }
      unitPriceMinor += variant.priceDeltaMinor;
    }

    const validatedAddons: Array<{ addonId: string; priceMinor: number; quantity: number }> = [];
    let addonsPerUnitMinor = 0;

    for (const reqAddon of input.addons) {
      const addon = await FoodAddonModel.findOne({
        _id: reqAddon.addonId,
        restaurantId: restaurant._id,
        isAvailable: true,
      }).lean();
      if (!addon) {
        throw new AppError(400, 'INVALID_ADDON', 'Selected add-on is unavailable');
      }
      addonsPerUnitMinor += addon.priceMinor * reqAddon.quantity;
      validatedAddons.push({
        addonId: String(addon._id),
        priceMinor: addon.priceMinor,
        quantity: reqAddon.quantity,
      });
    }

    const lineTotalMinor = (unitPriceMinor + addonsPerUnitMinor) * input.quantity;
    const cartItem = await CartItemModel.create({
      cartId: cart._id,
      foodItemId: food._id,
      variantId: input.variantId,
      quantity: input.quantity,
      unitPriceMinor,
      lineTotalMinor,
      specialInstructions: input.specialInstructions,
    });

    if (validatedAddons.length > 0) {
      await CartItemCustomizationModel.insertMany(
        validatedAddons.map((a) => ({
          cartItemId: cartItem._id,
          addonId: a.addonId,
          quantity: a.quantity,
          priceMinor: a.priceMinor,
        }))
      );
    }

    await this.recalculate(String(cart._id));
    return this.getCart(customerId);
  }

  static async updateItemQuantity(customerId: string, itemId: string, quantity: number) {
    const cart = await CartModel.findOne({ customerId });
    if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart not found');

    const item = await CartItemModel.findOne({ _id: itemId, cartId: cart._id });
    if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');

    if (quantity <= 0) {
      await CartItemCustomizationModel.deleteMany({ cartItemId: item._id });
      await item.deleteOne();
    } else {
      const customizations = await CartItemCustomizationModel.find({ cartItemId: item._id }).lean();
      const addonsPerUnit = customizations.reduce((s, c) => s + c.priceMinor * c.quantity, 0);
      item.quantity = quantity;
      item.lineTotalMinor = (item.unitPriceMinor + addonsPerUnit) * quantity;
      await item.save();
    }

    const remaining = await CartItemModel.countDocuments({ cartId: cart._id });
    if (remaining === 0) {
      await cart.deleteOne();
      return { cart: null, items: [] };
    }

    await this.recalculate(String(cart._id));
    return this.getCart(customerId);
  }

  static async applyCoupon(customerId: string, code: string) {
    const cart = await CartModel.findOne({ customerId });
    if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Add items to cart before applying a coupon');

    const now = new Date();
    const coupon = await CouponModel.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    }).lean();

    if (!coupon) {
      throw new AppError(400, 'INVALID_COUPON', 'Coupon code is invalid or expired');
    }
    if (coupon.restaurantId && String(coupon.restaurantId) !== String(cart.restaurantId)) {
      throw new AppError(400, 'COUPON_RESTAURANT_MISMATCH', 'Coupon is not valid for this restaurant');
    }
    if (cart.subtotalMinor < coupon.minOrderMinor) {
      throw new AppError(400, 'COUPON_MIN_ORDER', 'Order subtotal does not meet coupon minimum');
    }

    cart.couponCode = coupon.code;
    await cart.save();
    await this.recalculate(String(cart._id));
    return this.getCart(customerId);
  }

  static async clearCart(customerId: string) {
    const cart = await CartModel.findOne({ customerId });
    if (!cart) return;
    const items = await CartItemModel.find({ cartId: cart._id }).select('_id').lean();
    const itemIds = items.map((i) => i._id);
    if (itemIds.length > 0) {
      await CartItemCustomizationModel.deleteMany({ cartItemId: { $in: itemIds } });
      await CartItemModel.deleteMany({ cartId: cart._id });
    }
    await cart.deleteOne();
  }

  static async recalculate(cartId: string) {
    const cart = await CartModel.findById(cartId);
    if (!cart) return;

    const [items, branch, settings] = await Promise.all([
      CartItemModel.find({ cartId: cart._id }).lean(),
      RestaurantBranchModel.findById(cart.branchId).lean(),
      AppSettingModel.findOne({ key: 'platform_config' }).lean(),
    ]);

    const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    let deliveryFeeMinor = branch?.deliveryFeeMinor ?? settings?.baseDeliveryFeeMinor ?? 12000;
    let discountMinor = 0;

    if (cart.couponCode) {
      const now = new Date();
      const coupon = await CouponModel.findOne({
        code: cart.couponCode,
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
      }).lean();

      if (coupon && subtotalMinor >= coupon.minOrderMinor) {
        if (coupon.discountType === 'free_delivery') {
          deliveryFeeMinor = 0;
        } else if (coupon.discountType === 'fixed') {
          discountMinor = Math.min(subtotalMinor, coupon.value);
        } else if (coupon.discountType === 'percent') {
          const raw = Math.round((subtotalMinor * coupon.value) / 100);
          discountMinor = coupon.maxDiscountMinor ? Math.min(raw, coupon.maxDiscountMinor) : raw;
        }
      } else {
        cart.couponCode = undefined;
      }
    }

    const taxBps = settings?.taxBps ?? 0;
    const taxable = Math.max(0, subtotalMinor - discountMinor);
    const taxMinor = Math.round((taxable * taxBps) / 10_000);
    const totalMinor = taxable + deliveryFeeMinor + taxMinor;

    cart.subtotalMinor = subtotalMinor;
    cart.discountMinor = discountMinor;
    cart.deliveryFeeMinor = deliveryFeeMinor;
    cart.taxMinor = taxMinor;
    cart.totalMinor = totalMinor;
    await cart.save();
  }
}
