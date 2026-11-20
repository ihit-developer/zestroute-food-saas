import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { AdvancedService } from '../services/advanced.service.js';

const createGroupSchema = z.object({
  restaurantId: z.string().min(12),
  branchId: z.string().min(12),
});

const createScheduledSchema = z.object({
  restaurantId: z.string().min(12),
  branchId: z.string().min(12),
  scheduleType: z.enum(['once', 'recurring']).default('once'),
  cronOrDays: z.string().optional(),
  scheduledAt: z.coerce.date(),
  itemsSnapshot: z.array(z.unknown()).min(1),
});

const redeemSchema = z.object({
  points: z.number().int().min(1),
});

export const advancedRouter = Router();

advancedRouter.get('/campaigns', async (_req, res, next) => {
  try {
    const data = await AdvancedService.getCampaigns();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.get('/memberships', async (_req, res, next) => {
  try {
    const data = await AdvancedService.listMemberships();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.use(authenticate, requireRole('customer'));

advancedRouter.get('/recommendations', async (req, res, next) => {
  try {
    const data = await AdvancedService.getRecommendations(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.post('/group-orders', validateBody(createGroupSchema), async (req, res, next) => {
  try {
    const data = await AdvancedService.createGroupOrder(
      req.auth!.userId,
      req.body.restaurantId,
      req.body.branchId
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.get('/group-orders/:code', async (req, res, next) => {
  try {
    const data = await AdvancedService.getGroupOrder(String(req.params.code));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.post('/group-orders/:code/join', async (req, res, next) => {
  try {
    const data = await AdvancedService.joinGroupOrder(String(req.params.code), req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.get('/scheduled-orders', async (req, res, next) => {
  try {
    const data = await AdvancedService.listScheduledOrders(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.post('/scheduled-orders', validateBody(createScheduledSchema), async (req, res, next) => {
  try {
    const data = await AdvancedService.createScheduledOrder(req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.get('/loyalty', async (req, res, next) => {
  try {
    const data = await AdvancedService.getLoyalty(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

advancedRouter.post('/loyalty/redeem', validateBody(redeemSchema), async (req, res, next) => {
  try {
    const data = await AdvancedService.redeemPoints(req.auth!.userId, req.body.points);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
