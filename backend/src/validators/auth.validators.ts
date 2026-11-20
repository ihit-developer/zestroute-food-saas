import { z } from 'zod';

export const registerBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  password: z.string().min(8).max(128),
  role: z.enum(['customer', 'restaurant_owner', 'rider']).default('customer'),
}).refine((d) => Boolean(d.email || d.phone), {
  message: 'Either email or phone is required',
});

export const loginBodySchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20),
});

export const forgotPasswordBodySchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetPasswordBodySchema = z.object({
  identifier: z.string().trim().min(3),
  otp: z.string().trim().min(4).max(8),
  newPassword: z.string().min(8).max(128),
});

export const verifyOtpBodySchema = z.object({
  identifier: z.string().trim().min(3),
  otp: z.string().trim().min(4).max(8),
});
