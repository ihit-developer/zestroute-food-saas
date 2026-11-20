import { z } from 'zod';

export const riderLoginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const riderRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z.string().trim().min(10, 'Valid phone number is required'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  cnicNumber: z.string().trim().min(13, 'Enter valid 13-digit CNIC'),
  licenseNumber: z.string().trim().min(5, 'Driving license number is required'),
  vehicleType: z.enum(['bike', 'scooter', 'car']),
  vehicleNumber: z.string().trim().min(3, 'Vehicle plate number is required'),
});

export const deliveryOtpSchema = z.object({
  otp: z.string().trim().min(4, 'Enter the customer delivery OTP').max(6),
});

export const deliveryIssueSchema = z.object({
  reason: z.string().trim().min(5, 'Describe the delivery problem'),
});
