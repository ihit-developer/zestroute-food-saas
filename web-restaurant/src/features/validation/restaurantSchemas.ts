import { z } from 'zod';

export const restaurantLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const restaurantRegisterSchema = z.object({
  restaurantName: z.string().trim().min(2, 'Restaurant name is required'),
  ownerName: z.string().trim().min(2, 'Owner name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(10, 'Valid phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  address: z.string().trim().min(5, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  area: z.string().trim().min(2, 'Area is required'),
  cuisineType: z.string().trim().min(2, 'Cuisine type is required'),
  bankAccountTitle: z.string().trim().min(2, 'Bank account title is required'),
  bankIban: z.string().trim().min(10, 'IBAN / Account number is required'),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required'),
  sortOrder: z.coerce.number().int().min(0),
});

export const foodItemSchema = z.object({
  name: z.string().trim().min(2, 'Food name is required'),
  description: z.string().trim().min(5, 'Description is required'),
  categoryId: z.string().min(1, 'Select a category'),
  regularPricePkr: z.coerce.number().min(1, 'Price must be greater than 0'),
  discountPricePkr: z.coerce.number().min(0).optional(),
  prepTimeMins: z.coerce.number().int().min(1, 'Prep time is required'),
  stockQuantity: z.coerce.number().int().min(0, 'Stock cannot be negative'),
});

export const staffSchema = z.object({
  fullName: z.string().trim().min(2, 'Staff name is required'),
  email: z.string().trim().email('Valid email is required'),
  title: z.string().trim().min(2, 'Role title is required'),
});
