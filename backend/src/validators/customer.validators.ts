import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.enum(['home', 'office', 'other']).default('home'),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().min(2).max(120),
  street: z.string().trim().min(2).max(150),
  houseNumber: z.string().trim().min(1).max(60),
  building: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(150).optional(),
  deliveryInstructions: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

export const addCartItemSchema = z.object({
  foodItemId: z.string().min(12),
  branchId: z.string().min(12),
  variantId: z.string().min(12).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  addons: z
    .array(
      z.object({
        addonId: z.string().min(12),
        quantity: z.number().int().min(1).max(10).default(1),
      })
    )
    .default([]),
  specialInstructions: z.string().trim().max(300).optional(),
  replaceCart: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
  specialInstructions: z.string().trim().max(300).optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(2).max(40),
});

export const createOrderSchema = z.object({
  addressId: z.string().min(12),
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa', 'card', 'wallet']),
  tipMinor: z.number().int().min(0).max(500_000).default(0),
  deliveryInstructions: z.string().trim().max(300).optional(),
  pinnedLatitude: z.number().min(-90).max(90).optional(),
  pinnedLongitude: z.number().min(-180).max(180).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const createReviewSchema = z.object({
  orderId: z.string().min(12),
  restaurantRating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
});

export const createSupportTicketSchema = z.object({
  orderId: z.string().min(12).optional(),
  orderNumber: z.string().trim().max(40).optional(),
  restaurantId: z.string().min(12).optional(),
  targetType: z.enum(['restaurant', 'admin']).optional(),
  category: z.enum(['missing_food', 'wrong_order', 'late_delivery', 'refund', 'other']),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(2).max(2000),
});
