import type { NextFunction, Request, Response } from 'express';
import {
  RestaurantModel,
  RestaurantStaffModel,
  RestaurantStaffPermissionModel,
} from '../models/index.js';

export type PlatformRole =
  | 'customer'
  | 'restaurant_owner'
  | 'restaurant_staff'
  | 'rider'
  | 'super_admin';

export type StaffPermissionScope = 'orders' | 'menu' | 'inventory' | 'reports' | 'branches';

export function requireRole(...allowedRoles: PlatformRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRoles = req.auth?.roles ?? [];
    const authorized = allowedRoles.some((r) => userRoles.includes(r));
    if (!authorized) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient role permissions' },
      });
      return;
    }
    next();
  };
}

export function requireRestaurantAccess(requiredScope?: StaffPermissionScope) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.auth?.userId;
    const roles = req.auth?.roles ?? [];
    const restaurantId = req.params.restaurantId || req.body?.restaurantId || req.query?.restaurantId;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (roles.includes('super_admin')) {
      next();
      return;
    }

    if (!restaurantId || typeof restaurantId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_RESTAURANT', message: 'Restaurant identifier is required' },
      });
      return;
    }

    const owned = await RestaurantModel.findOne({ _id: restaurantId, ownerId: userId }).select('_id').lean();
    if (owned) {
      next();
      return;
    }

    const staff = await RestaurantStaffModel.findOne({
      restaurantId,
      userId,
      isActive: true,
    }).lean();

    if (!staff) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_RESTAURANT', message: 'Not authorized for this restaurant' },
      });
      return;
    }

    if (requiredScope) {
      const permDoc = await RestaurantStaffPermissionModel.findOne({ staffId: staff._id }).lean();
      if (!permDoc || !permDoc.permissions.includes(requiredScope)) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_SCOPE', message: `Missing staff permission: ${requiredScope}` },
        });
        return;
      }
    }

    next();
  };
}

export function requireOwnership(resolveOwnerId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.auth?.roles.includes('super_admin')) {
      next();
      return;
    }

    const ownerId = await resolveOwnerId(req);
    if (!ownerId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }

    if (ownerId !== req.auth?.userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_RESOURCE', message: 'You do not have access to this resource' },
      });
      return;
    }

    next();
  };
}
