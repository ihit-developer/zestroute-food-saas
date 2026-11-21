import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  applyRiderSchema,
  completeDeliverySchema,
  riderLocationSchema,
  toggleRiderStatusSchema,
} from '../validators/rider.validators.js';
import { RiderService } from '../services/rider.service.js';

export const riderRouter = Router();
riderRouter.use(authenticate, requireRole('rider', 'super_admin'));

riderRouter.post('/apply', validateBody(applyRiderSchema), async (req, res, next) => {
  try {
    const data = await RiderService.apply(req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/dashboard', async (req, res, next) => {
  try {
    const data = await RiderService.getDashboard(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.patch('/status', validateBody(toggleRiderStatusSchema), async (req, res, next) => {
  try {
    const data = await RiderService.setOnlineStatus(req.auth!.userId, req.body.isOnline);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/requests', async (req, res, next) => {
  try {
    const data = await RiderService.listRequests(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.post('/requests/:assignmentId/accept', async (req, res, next) => {
  try {
    const data = await RiderService.acceptAssignment(
      req.auth!.userId,
      String(req.params.assignmentId)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.post('/requests/:assignmentId/decline', async (req, res, next) => {
  try {
    const data = await RiderService.declineAssignment(
      req.auth!.userId,
      String(req.params.assignmentId)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.patch('/deliveries/:deliveryId/pickup', async (req, res, next) => {
  try {
    const data = await RiderService.markPickedUp(
      req.auth!.userId,
      String(req.params.deliveryId)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.patch('/deliveries/:deliveryId/on-the-way', async (req, res, next) => {
  try {
    const data = await RiderService.markOnTheWay(
      req.auth!.userId,
      String(req.params.deliveryId)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.post(
  '/deliveries/:deliveryId/location',
  validateBody(riderLocationSchema),
  async (req, res, next) => {
    try {
      const data = await RiderService.recordLocation(
        req.auth!.userId,
        String(req.params.deliveryId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

riderRouter.post(
  '/deliveries/:deliveryId/complete',
  validateBody(completeDeliverySchema),
  async (req, res, next) => {
    try {
      const data = await RiderService.completeDelivery(
        req.auth!.userId,
        String(req.params.deliveryId),
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

riderRouter.get('/earnings', async (req, res, next) => {
  try {
    const data = await RiderService.getEarnings(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.post('/payouts/request', async (req, res, next) => {
  try {
    const amountMinor = Number(req.body?.amountMinor ?? 0);
    const data = await RiderService.requestPayout(req.auth!.userId, amountMinor);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/history', async (req, res, next) => {
  try {
    const data = await RiderService.getHistory(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/profile', async (req, res, next) => {
  try {
    const data = await RiderService.getProfile(req.auth!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.patch('/profile', async (req, res, next) => {
  try {
    const data = await RiderService.updateProfile(req.auth!.userId, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

riderRouter.patch('/password', async (req, res, next) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const data = await RiderService.changePassword(req.auth!.userId, currentPassword, newPassword);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
