import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().min(10, 'Enter a valid phone number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your registered email or phone'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const addressSchema = z.object({
  label: z.enum(['home', 'office', 'other']),
  fullName: z.string().trim().min(2, 'Recipient name is required'),
  phone: z.string().trim().min(10, 'Phone number is required'),
  city: z.string().trim().min(2, 'City is required'),
  area: z.string().trim().min(2, 'Area is required'),
  street: z.string().trim().min(2, 'Street is required'),
  houseNumber: z.string().trim().min(1, 'House/Flat number is required'),
  building: z.string().optional(),
  landmark: z.string().optional(),
  deliveryInstructions: z.string().optional(),
});

export const supportTicketSchema = z.object({
  category: z.enum(['missing_food', 'wrong_order', 'late_delivery', 'refund', 'other']),
  orderNumber: z.string().trim().optional(),
  subject: z.string().trim().min(4, 'Subject is required'),
  description: z.string().trim().min(10, 'Please describe the issue in detail'),
});
