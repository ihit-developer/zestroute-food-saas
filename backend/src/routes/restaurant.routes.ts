import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireActiveSubscription, requireRestaurantAccess, requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  applyRestaurantSchema,
  createFoodItemSchema,
  createRestaurantCategorySchema,
  createStaffSchema,
  replyReviewSchema,
  updateFoodItemSchema,
  updateOrderStatusSchema,
  updateStockSchema,
} from '../validators/restaurant.validators.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { SubscriptionService } from '../services/subscription.service.js';

export const restaurantRouter = Router();
restaurantRouter.use(authenticate);

restaurantRouter.get('/mine', async (req, res, next) => {
  try {
    const data = await RestaurantService.listMine(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

restaurantRouter.post(
  '/apply',
  requireRole('restaurant_owner', 'customer', 'super_admin'),
  validateBody(applyRestaurantSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.apply(req.auth!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/subscription',
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await SubscriptionService.getVendorSubscriptionOverview(
        String(req.params.restaurantId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/subscription/payments',
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await SubscriptionService.submitVendorPayment(
        String(req.params.restaurantId),
        req.auth!.userId,
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/dashboard',
  requireRestaurantAccess('reports'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.getDashboardMetrics(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/orders',
  requireRestaurantAccess('orders'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const statusTab = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await RestaurantService.listOrders(String(req.params.restaurantId), statusTab);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/orders',
  requireRestaurantAccess('orders'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createManualOrder(
        String(req.params.restaurantId),
        req.auth!.userId,
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/orders/:orderId',
  requireRestaurantAccess('orders'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateOrderDetails(
        String(req.params.restaurantId),
        String(req.params.orderId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/orders/:orderId',
  requireRestaurantAccess('orders'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteOrder(
        String(req.params.restaurantId),
        String(req.params.orderId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/orders/:orderId/status',
  requireRestaurantAccess('orders'),
  requireActiveSubscription(),
  validateBody(updateOrderStatusSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.transitionOrderStatus(
        String(req.params.restaurantId),
        String(req.params.orderId),
        req.auth!.userId,
        req.body.status,
        req.body.note
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/categories',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listCategories(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/categories',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  validateBody(createRestaurantCategorySchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createCategory(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/foods',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listFoodItems(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/foods',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  validateBody(createFoodItemSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createFoodItem(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/foods/:foodId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  validateBody(updateFoodItemSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateFoodItem(
        String(req.params.restaurantId),
        String(req.params.foodId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/foods/:foodId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteFoodItem(
        String(req.params.restaurantId),
        String(req.params.foodId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/inventory',
  requireRestaurantAccess('inventory'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listInventory(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/stock',
  requireRestaurantAccess('inventory'),
  requireActiveSubscription(),
  validateBody(updateStockSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateStock(String(req.params.restaurantId), req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/staff',
  requireRole('restaurant_owner', 'super_admin'),
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listStaff(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/staff',
  requireRole('restaurant_owner', 'super_admin'),
  requireRestaurantAccess(),
  validateBody(createStaffSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.addStaff(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/staff/:staffId',
  requireRole('restaurant_owner', 'super_admin'),
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateStaff(
        String(req.params.restaurantId),
        String(req.params.staffId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/staff/:staffId',
  requireRole('restaurant_owner', 'super_admin'),
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteStaff(
        String(req.params.restaurantId),
        String(req.params.staffId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/categories/:categoryId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateCategory(
        String(req.params.restaurantId),
        String(req.params.categoryId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/categories/:categoryId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteCategory(
        String(req.params.restaurantId),
        String(req.params.categoryId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/inventory',
  requireRestaurantAccess('inventory'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createIngredient(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/inventory/:ingredientId',
  requireRestaurantAccess('inventory'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateIngredient(
        String(req.params.restaurantId),
        String(req.params.ingredientId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/inventory/:ingredientId',
  requireRestaurantAccess('inventory'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteIngredient(
        String(req.params.restaurantId),
        String(req.params.ingredientId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/promotions',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listPromotions(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/promotions',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createPromotion(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/promotions/:promoId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updatePromotion(
        String(req.params.restaurantId),
        String(req.params.promoId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/promotions/:promoId',
  requireRestaurantAccess('menu'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deletePromotion(
        String(req.params.restaurantId),
        String(req.params.promoId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/branches',
  requireRestaurantAccess('branches'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listBranches(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/branches',
  requireRestaurantAccess('branches'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.createBranch(String(req.params.restaurantId), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/branches/:branchId',
  requireRestaurantAccess('branches'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateBranch(
        String(req.params.restaurantId),
        String(req.params.branchId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.delete(
  '/:restaurantId/branches/:branchId',
  requireRestaurantAccess('branches'),
  requireActiveSubscription(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.deleteBranch(
        String(req.params.restaurantId),
        String(req.params.branchId)
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/profile',
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.getProfile(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.patch(
  '/:restaurantId/profile',
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.updateProfile(String(req.params.restaurantId), req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/reviews',
  requireRestaurantAccess(),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.listReviews(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.post(
  '/:restaurantId/reviews/:reviewId/reply',
  requireRestaurantAccess(),
  validateBody(replyReviewSchema),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.replyToReview(
        String(req.params.restaurantId),
        String(req.params.reviewId),
        req.body.ownerReply
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

restaurantRouter.get(
  '/:restaurantId/finance',
  requireRestaurantAccess('reports'),
  async (req, res, next) => {
    try {
      const data = await RestaurantService.getFinancials(String(req.params.restaurantId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
