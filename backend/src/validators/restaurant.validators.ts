import { z } from 'zod';

export const applyRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  cuisineTypes: z.array(z.string().trim().min(1)).min(1),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
  area: z.string().trim().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  bankAccountTitle: z.string().trim().min(2),
  bankIbanMasked: z.string().trim().min(6),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
  area: z.string().trim().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryRadiusMeters: z.number().int().min(500).default(8000),
  minOrderMinor: z.number().int().min(0).default(30000),
  deliveryFeeMinor: z.number().int().min(0).default(12000),
});

export const createRestaurantCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  sortOrder: z.number().int().min(0).default(0),
});

export const createFoodItemSchema = z.object({
  restaurantCategoryId: z.string().min(12).optional(),
  globalCategoryId: z.string().min(12).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional(),
  ingredients: z.array(z.string().trim()).default([]),
  regularPriceMinor: z.number().int().min(100),
  discountPriceMinor: z.number().int().min(0).optional(),
  prepTimeMins: z.number().int().min(1).default(15),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
});

export const updateFoodItemSchema = createFoodItemSchema.partial();

export const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready_for_pickup', 'delivered', 'rejected']),
  note: z.string().trim().max(300).optional(),
});

export const updateStockSchema = z.object({
  ingredientId: z.string().min(12),
  branchId: z.string().min(12),
  quantity: z.number().min(0, 'Stock quantity cannot be negative'),
});

export const createStaffSchema = z.object({
  userId: z.string().min(12).optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128).optional(),
  branchId: z.string().min(12).optional(),
  title: z.string().trim().min(2).max(80),
  permissions: z.array(z.enum(['orders', 'menu', 'inventory', 'reports', 'branches'])).min(1),
});

export const replyReviewSchema = z.object({
  ownerReply: z.string().trim().min(2).max(1000),
});
