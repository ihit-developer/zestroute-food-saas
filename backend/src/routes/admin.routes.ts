import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { recordAuditLog } from '../middleware/audit.middleware.js';
import {
  accountStatusSchema,
  createBannerSchema,
  createCouponSchema,
  createGlobalCategorySchema,
  processRefundSchema,
  reviewApplicationSchema,
  updateCommissionSchema,
  updateSettingsSchema,
} from '../validators/admin.validators.js';
import { AdminService } from '../services/admin.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { CustomerEngagementService } from '../services/customerEngagement.service.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('super_admin'));

adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const data = await AdminService.getDashboard();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/customers', async (_req, res, next) => {
  try {
    const data = await AdminService.listCustomers();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/customers/:id/status',
  validateBody(accountStatusSchema),
  async (req, res, next) => {
    try {
      const data = await AdminService.setAccountStatus(
        String(req.params.id),
        req.body.accountStatus
      );
      await recordAuditLog({
        req,
        action: `customer_${req.body.accountStatus}`,
        resourceType: 'profile',
        resourceId: String(req.params.id),
        after: { accountStatus: req.body.accountStatus },
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/restaurants', async (_req, res, next) => {
  try {
    const data = await AdminService.listRestaurants('directory');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/restaurant-applications', async (_req, res, next) => {
  try {
    const data = await AdminService.listRestaurants('applications');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/restaurants/:id/review',
  validateBody(reviewApplicationSchema),
  async (req, res, next) => {
    try {
      const data = await AdminService.reviewRestaurant(String(req.params.id), req.body.status);
      await recordAuditLog({
        req,
        action: `restaurant_${req.body.status}`,
        resourceType: 'restaurant',
        resourceId: String(req.params.id),
        after: { status: req.body.status, reason: req.body.reason },
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/riders', async (_req, res, next) => {
  try {
    const data = await AdminService.listRiders('directory');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/rider-applications', async (_req, res, next) => {
  try {
    const data = await AdminService.listRiders('applications');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/riders/:id/review',
  validateBody(reviewApplicationSchema),
  async (req, res, next) => {
    try {
      const data = await AdminService.reviewRider(String(req.params.id), req.body.status);
      await recordAuditLog({
        req,
        action: `rider_${req.body.status}`,
        resourceType: 'rider',
        resourceId: String(req.params.id),
        after: { status: req.body.status },
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/orders', async (_req, res, next) => {
  try {
    const data = await AdminService.listOrders();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/categories', async (_req, res, next) => {
  try {
    const data = await AdminService.listCategories();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/categories', validateBody(createGlobalCategorySchema), async (req, res, next) => {
  try {
    const data = await AdminService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/categories/:id', async (req, res, next) => {
  try {
    const data = await AdminService.updateCategory(String(req.params.id), req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/categories/:id', async (req, res, next) => {
  try {
    const data = await AdminService.deleteCategory(String(req.params.id));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/coupons', async (_req, res, next) => {
  try {
    const data = await AdminService.listCoupons();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/coupons', validateBody(createCouponSchema), async (req, res, next) => {
  try {
    const data = await AdminService.createCoupon(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/coupons/:id', async (req, res, next) => {
  try {
    const data = await AdminService.updateCoupon(String(req.params.id), req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/coupons/:id', async (req, res, next) => {
  try {
    const data = await AdminService.deleteCoupon(String(req.params.id));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/banners', async (_req, res, next) => {
  try {
    const data = await AdminService.listBanners();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/banners', validateBody(createBannerSchema), async (req, res, next) => {
  try {
    const data = await AdminService.createBanner(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/banners/:id', async (req, res, next) => {
  try {
    const data = await AdminService.updateBanner(String(req.params.id), req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/banners/:id', async (req, res, next) => {
  try {
    const data = await AdminService.deleteBanner(String(req.params.id));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/commissions/:restaurantId',
  validateBody(updateCommissionSchema),
  async (req, res, next) => {
    try {
      const data = await AdminService.updateRestaurantCommission(
        String(req.params.restaurantId),
        req.body.commissionBps
      );
      await recordAuditLog({
        req,
        action: 'update_commission',
        resourceType: 'restaurant',
        resourceId: String(req.params.restaurantId),
        after: { commissionBps: req.body.commissionBps },
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/payments', async (_req, res, next) => {
  try {
    const data = await AdminService.listPayments();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/rider-payouts', async (_req, res, next) => {
  try {
    const data = await AdminService.listRiderPayouts();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/rider-payouts/:id', async (req, res, next) => {
  try {
    const status = req.body?.status === 'failed' ? 'failed' : 'paid';
    const data = await AdminService.processRiderPayout(String(req.params.id), status);
    await recordAuditLog({
      req,
      action: `rider_payout_${status}`,
      resourceType: 'rider_payout',
      resourceId: String(req.params.id),
      after: { status },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/refunds', async (_req, res, next) => {
  try {
    const data = await AdminService.listRefunds();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/refunds/:id', validateBody(processRefundSchema), async (req, res, next) => {
  try {
    const data = await AdminService.processRefund(
      String(req.params.id),
      req.auth!.userId,
      req.body.status,
      req.body.adminNotes
    );
    await recordAuditLog({
      req,
      action: `refund_${req.body.status}`,
      resourceType: 'refund',
      resourceId: String(req.params.id),
      after: { status: req.body.status },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/complaints', async (_req, res, next) => {
  try {
    const data = await AdminService.listComplaints();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Real-Time Live Support Chat Desk (Customers, Riders & Restaurant Owners) ───

adminRouter.get('/support/tickets', async (_req, res, next) => {
  try {
    const data = await CustomerEngagementService.listAllSupportTicketsForAdmin();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/support/tickets/:ticketId', async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.getSupportTicketDetail(
      String(req.params.ticketId),
      req.auth!.userId,
      true
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support/tickets/:ticketId/messages', async (req, res, next) => {
  try {
    const data = await CustomerEngagementService.postSupportMessage(
      String(req.params.ticketId),
      req.auth!.userId,
      'super_admin',
      String(req.body?.message ?? '')
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/support/tickets/:ticketId/status', async (req, res, next) => {
  try {
    const allowed = ['open', 'in_progress', 'resolved', 'closed'] as const;
    const status = allowed.includes(req.body?.status) ? req.body.status : 'resolved';
    const data = await CustomerEngagementService.updateSupportTicketStatus(
      String(req.params.ticketId),
      status
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit-logs', async (_req, res, next) => {
  try {
    const data = await AdminService.listAuditLogs();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/settings', async (_req, res, next) => {
  try {
    const data = await AdminService.getSettings();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/settings', validateBody(updateSettingsSchema), async (req, res, next) => {
  try {
    const data = await AdminService.updateSettings(req.body);
    await recordAuditLog({
      req,
      action: 'update_platform_settings',
      resourceType: 'app_settings',
      resourceId: 'platform_config',
      after: req.body,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Multi-Vendor SaaS Subscriptions, Packages & Payment Verification ───

adminRouter.get('/subscriptions/overview', async (_req, res, next) => {
  try {
    const data = await SubscriptionService.getAdminOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/subscription-packages', async (_req, res, next) => {
  try {
    const data = await SubscriptionService.listAllPackages();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/subscription-packages', async (req, res, next) => {
  try {
    const data = await SubscriptionService.createPackage(req.body);
    await recordAuditLog({
      req,
      action: 'create_subscription_package',
      resourceType: 'subscription_package',
      resourceId: String(data._id),
      after: req.body,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/subscription-packages/:id', async (req, res, next) => {
  try {
    const data = await SubscriptionService.updatePackage(String(req.params.id), req.body);
    await recordAuditLog({
      req,
      action: 'update_subscription_package',
      resourceType: 'subscription_package',
      resourceId: String(req.params.id),
      after: req.body,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/subscription-packages/:id', async (req, res, next) => {
  try {
    const data = await SubscriptionService.deletePackage(String(req.params.id));
    await recordAuditLog({
      req,
      action: 'delete_subscription_package',
      resourceType: 'subscription_package',
      resourceId: String(req.params.id),
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/subscription-payments/:id/review', async (req, res, next) => {
  try {
    const decision = req.body?.decision === 'rejected' ? 'rejected' : 'approved';
    const data = await SubscriptionService.reviewPayment(
      String(req.params.id),
      req.auth!.userId,
      decision,
      typeof req.body?.reason === 'string' ? req.body.reason : undefined
    );
    await recordAuditLog({
      req,
      action: `subscription_payment_${decision}`,
      resourceType: 'subscription_payment',
      resourceId: String(req.params.id),
      after: { decision, reason: req.body?.reason },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/vendor-subscriptions/:restaurantId', async (req, res, next) => {
  try {
    const data = await SubscriptionService.adminUpdateVendorSubscription(
      String(req.params.restaurantId),
      req.body
    );
    await recordAuditLog({
      req,
      action: 'admin_update_vendor_subscription',
      resourceType: 'vendor_subscription',
      resourceId: String(req.params.restaurantId),
      after: req.body,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/subscription-config', async (req, res, next) => {
  try {
    const data = await SubscriptionService.updateTrialConfig({
      defaultTrialDays: req.body?.defaultTrialDays !== undefined ? Number(req.body.defaultTrialDays) : undefined,
      paymentInstructions:
        typeof req.body?.paymentInstructions === 'string' ? req.body.paymentInstructions : undefined,
    });
    await recordAuditLog({
      req,
      action: 'update_subscription_config',
      resourceType: 'app_settings',
      resourceId: 'platform_config',
      after: req.body,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
