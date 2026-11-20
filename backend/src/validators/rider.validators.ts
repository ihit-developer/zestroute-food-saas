import { z } from 'zod';

export const applyRiderSchema = z.object({
  vehicleType: z.enum(['bike', 'scooter', 'car']),
  vehicleNumber: z.string().trim().min(3).max(30),
  cnicMasked: z.string().trim().min(6).max(25),
  licenseNumber: z.string().trim().min(4).max(40),
});

export const toggleRiderStatusSchema = z.object({
  isOnline: z.boolean(),
});

export const riderLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

export const completeDeliverySchema = z.object({
  otp: z.string().trim().min(4).max(6),
  proofPhotoUrl: z.string().url().optional(),
});
