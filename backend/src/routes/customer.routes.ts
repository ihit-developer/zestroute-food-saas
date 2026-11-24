import { Router } from 'express';
import { CouponModel, ProfileModel } from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  addCartItemSchema,
  applyCouponSchema,
  cancelOrderSchema,
  createAddressSchema,
  createOrderSchema,
  createReviewSchema,
  createSupportTicketSchema,
  updateCartItemSchema,
} from '../validators/customer.validators.js';
import { CartService } from '../services/cart.service.js';
import { OrderService } from '../services/order.service.js';
import { CustomerEngagementService } from '../services/customerEngagement.service.js';

export const customerRouter = Router();
const customerAuth = [authenticate, requireRole('customer')] as const;

// Profile & Password update
customerRouter.patch('/profile', ...customerAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const profile = await ProfileModel.findById(userId).select('+passwordHash');
    if (!profile) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }

    if (typeof req.body?.fullName === 'string' && req.body.fullName.trim().length >= 2) {
      profile.fullName = req.body.fullName.trim();
    }
    if (typeof req.body?.phone === 'string' && req.body.phone.trim().length >= 7) {
      profile.phone = req.body.phone.trim();
    }
    if (typeof req.body?.email === 'string' && req.body.email.trim().includes('@')) {
      const nextEmail = req.body.email.trim().toLowerCase();
      if (nextEmail !== profile.email) {
        const exists = await ProfileModel.findOne({ email: nextEmail, _id: { $ne: userId } }).lean();
        if (exists) {
          throw new AppError(409, 'EMAIL_IN_USE', 'That email address is already registered');
        }
        profile.email = nextEmail;
      }
    }

    if (typeof req.body?.newPassword === 'string' && req.body.newPassword.length > 0) {
      if (req.body.newPassword.length < 8) {
        throw new AppError(400, 'WEAK_PASSWORD', 'New password must be at least 8 characters');
      }
      const currentPass = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      if (!currentPass) {
        throw new AppError(400, 'CURRENT_PASSWORD_REQUIRED', 'Please enter your current password');
      }
      const valid = await verifyPassword(currentPass, profile.passwordHash);
      if (!valid) {
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }
      profile.passwordHash = await hashPassword(req.body.newPassword);
    }

    await profile.save();
    res.status(200).json({
      success: true,
      data: {
        id: String(profile._id),
        fullName: profile.fullName,
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        avatarUrl: profile.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Addresses
customerRouter.get('/addresses', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.listAddresses(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/addresses', ...customerAuth, validateBody(createAddressSchema), async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.createAddress(req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.delete('/addresses/:id', ...customerAuth, async (req, res, next) => {
  try {
    await CustomerEngagementService.deleteAddress(req.auth!.userId, String(req.params.id));
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// Cart
customerRouter.get('/cart', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CartService.getCart(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/cart/items', ...customerAuth, validateBody(addCartItemSchema), async (req, res, next) => {
  try {
    const data = await CartService.addItem(req.auth!.userId, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.patch('/cart/items/:itemId', ...customerAuth, validateBody(updateCartItemSchema), async (req, res, next) => {
  try {
    const data = await CartService.updateItemQuantity(
      req.auth!.userId,
      String(req.params.itemId),
      req.body.quantity
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/coupons/validate', ...customerAuth, async (req, res, next) => {
  try {
    const rawCode = String(req.body?.code ?? '').trim().toUpperCase();
    const subtotalMinor = Math.max(0, Number(req.body?.subtotalMinor) || 0);
    const restaurantId = req.body?.restaurantId ? String(req.body.restaurantId) : undefined;

    if (!rawCode) {
      throw new AppError(400, 'COUPON_REQUIRED', 'Please enter a coupon code');
    }

    const now = new Date();
    const coupon = await CouponModel.findOne({ code: rawCode, isActive: true }).lean();
    if (!coupon) {
      throw new AppError(404, 'COUPON_NOT_FOUND', `Coupon "${rawCode}" is invalid or inactive`);
    }
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw new AppError(400, 'COUPON_NOT_STARTED', 'This coupon is not active yet');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw new AppError(400, 'COUPON_EXPIRED', 'This coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(400, 'COUPON_LIMIT_REACHED', 'This coupon has reached its usage limit');
    }
    if (
      coupon.scope === 'restaurant' &&
      coupon.restaurantId &&
      restaurantId &&
      String(coupon.restaurantId) !== restaurantId
    ) {
      throw new AppError(400, 'COUPON_WRONG_RESTAURANT', 'This coupon is only valid for another restaurant');
    }
    if (coupon.minOrderMinor && subtotalMinor < coupon.minOrderMinor) {
      throw new AppError(
        400,
        'MIN_ORDER_NOT_MET',
        `Minimum order of PKR ${(coupon.minOrderMinor / 100).toFixed(0)} required for ${rawCode}`
      );
    }

    let discountMinor = 0;
    if (coupon.discountType === 'percent') {
      discountMinor = Math.round((subtotalMinor * coupon.value) / 100);
      if (coupon.maxDiscountMinor) {
        discountMinor = Math.min(discountMinor, coupon.maxDiscountMinor);
      }
    } else if (coupon.discountType === 'fixed') {
      discountMinor = Math.min(subtotalMinor, coupon.value);
    } else if (coupon.discountType === 'free_delivery') {
      discountMinor = 12000;
    }

    res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        discountMinor,
        message: `Coupon ${coupon.code} applied!`,
      },
    });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/cart/coupon', ...customerAuth, validateBody(applyCouponSchema), async (req, res, next) => {
  try {
    const data = await CartService.applyCoupon(req.auth!.userId, req.body.code);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.delete('/cart', ...customerAuth, async (req, res, next) => {
  try {
    await CartService.clearCart(req.auth!.userId);
    res.status(200).json({ success: true, data: { cleared: true } });
  } catch (err) {
    next(err);
  }
});

// Orders
customerRouter.post('/orders', ...customerAuth, validateBody(createOrderSchema), async (req, res, next) => {
  try {
    const idempotencyKey = String(req.headers['idempotency-key'] ?? '');
    const data = await OrderService.createOrder(req.auth!.userId, idempotencyKey, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/orders', ...customerAuth, async (req, res, next) => {
  try {
    const tab = (req.query.tab as 'active' | 'completed' | 'cancelled') || 'active';
    const data = await OrderService.listOrders(req.auth!.userId, tab);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/orders/:id', ...customerAuth, async (req, res, next) => {
  try {
    const data = await OrderService.getOrderDetail(req.auth!.userId, String(req.params.id));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/orders/:id/invoice', ...customerAuth, async (req, res, next) => {
  try {
    const { filename, buffer } = await OrderService.getOrderInvoicePdf(
      req.auth!.userId,
      String(req.params.id)
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/orders/:id/cancel', ...customerAuth, validateBody(cancelOrderSchema), async (req, res, next) => {
  try {
    const data = await OrderService.cancelOrder(
      req.auth!.userId,
      String(req.params.id),
      req.body.reason
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.delete('/orders/:id', ...customerAuth, async (req, res, next) => {
  try {
    const data = await OrderService.deleteCustomerOrder(
      req.auth!.userId,
      String(req.params.id)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Favorites, Reviews, Wallet, Notifications, Support
customerRouter.get('/favorites', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.listFavorites(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/favorites/toggle', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.toggleFavorite(
      req.auth!.userId,
      req.body.targetType,
      req.body.targetId
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/reviews', ...customerAuth, validateBody(createReviewSchema), async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.createReview(req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/wallet', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.getWallet(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/notifications', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.listNotifications(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.patch('/notifications/read-all', ...customerAuth, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.markAllNotificationsRead(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/support/tickets', authenticate, async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const viewerRole = roles.includes('restaurant_owner') || roles.includes('restaurant_staff')
      ? 'restaurant_owner'
      : roles.includes('rider')
        ? 'rider'
        : 'customer';
    const restaurantId = typeof req.query.restaurantId === 'string' ? req.query.restaurantId : undefined;
    const data = await CustomerEngagementService.listSupportTickets(req.auth!.userId, viewerRole, restaurantId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/support/tickets', authenticate, validateBody(createSupportTicketSchema), async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const senderRole = roles.includes('restaurant_owner') || roles.includes('restaurant_staff')
      ? 'restaurant_owner'
      : roles.includes('rider')
        ? 'rider'
        : 'customer';
    const data = await CustomerEngagementService.createSupportTicket(req.auth!.userId, req.body, senderRole);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.get('/support/tickets/:ticketId', authenticate, async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const data = await CustomerEngagementService.getSupportTicketDetail(
      String(req.params.ticketId),
      req.auth!.userId,
      roles
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/support/tickets/:ticketId/messages', authenticate, async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const senderRole = roles.includes('super_admin')
      ? 'super_admin'
      : roles.includes('restaurant_owner') || roles.includes('restaurant_staff')
        ? 'restaurant_owner'
        : roles.includes('rider')
          ? 'rider'
          : 'customer';
    const data = await CustomerEngagementService.postSupportMessage(
      String(req.params.ticketId),
      req.auth!.userId,
      senderRole,
      String(req.body?.message ?? '')
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/support/tickets/:ticketId/typing', authenticate, async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const data = await CustomerEngagementService.setSupportTyping(
      String(req.params.ticketId),
      req.auth!.userId,
      roles
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/support/tickets/:ticketId/escalate', authenticate, async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.escalateSupportTicket(
      String(req.params.ticketId),
      req.auth!.userId
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.post('/support/tickets/:ticketId/rate', authenticate, async (req, res, next) => {
  try {
    const rating = Number(req.body?.rating);
    const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback : undefined;
    const data = await CustomerEngagementService.rateSupportTicket(
      String(req.params.ticketId),
      req.auth!.userId,
      rating,
      feedback
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

customerRouter.patch('/support/tickets/:ticketId/status', authenticate, async (req, res, next) => {
  try {
    const roles = req.auth!.roles ?? [];
    const allowed = ['open', 'in_progress', 'resolved', 'closed'] as const;
    const status = allowed.includes(req.body?.status) ? req.body.status : 'resolved';
    const data = await CustomerEngagementService.updateSupportTicketStatusByActor(
      String(req.params.ticketId),
      req.auth!.userId,
      roles,
      status
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
