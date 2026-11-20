import { z } from 'zod';

export const reviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended', 'under_review']),
  reason: z.string().trim().max(300).optional(),
});

export const accountStatusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended']),
});

export const createGlobalCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  nameUr: z.string().trim().max(80).optional(),
  slug: z.string().trim().min(2).max(80),
  sortOrder: z.number().int().min(0).default(0),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  scope: z.enum(['global', 'restaurant', 'user']).default('global'),
  restaurantId: z.string().min(12).optional(),
  discountType: z.enum(['percent', 'fixed', 'free_delivery']),
  value: z.number().int().min(0),
  minOrderMinor: z.number().int().min(0).default(0),
  maxDiscountMinor: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});

export const createBannerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional(),
  imageUrl: z.string().url(),
  destinationType: z.enum(['restaurant', 'category', 'url', 'none']).default('none'),
  destinationId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCommissionSchema = z.object({
  commissionBps: z.number().int().min(0).max(5000),
});

export const processRefundSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().trim().max(500).optional(),
});

export const updateSettingsSchema = z.object({
  appName: z.string().trim().min(2).max(80).optional(),
  taxBps: z.number().int().min(0).max(3000).optional(),
  defaultCommissionBps: z.number().int().min(0).max(5000).optional(),
  baseDeliveryFeeMinor: z.number().int().min(0).optional(),
  minOrderMinor: z.number().int().min(0).optional(),
  festivalMode: z.enum(['none', 'ramadan', 'eid', 'festival']).optional(),
});
