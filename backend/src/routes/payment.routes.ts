import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { PaymentService, type OnlineProvider } from '../services/payment.service.js';
import { PaymentModel } from '../models/index.js';

const initiateSchema = z.object({
  orderId: z.string().min(12),
  provider: z.enum(['jazzcash', 'easypaisa', 'card']),
});

const sendOtpSchema = z.object({
  provider: z.enum(['jazzcash', 'easypaisa', 'card']),
  accountNumber: z.string().trim().min(4).max(40),
});

const verifyOnlineSchema = z.object({
  orderId: z.string().min(12),
  provider: z.enum(['jazzcash', 'easypaisa', 'card']),
  accountNumber: z.string().trim().min(4).max(40),
  transactionRef: z.string().trim().min(6).max(60),
  otpCode: z.string().trim().length(6),
});

const refundRequestSchema = z.object({
  orderId: z.string().min(12),
  reason: z.string().trim().min(5).max(500),
});

export const paymentRouter = Router();

paymentRouter.post(
  '/send-verification-otp',
  authenticate,
  requireRole('customer'),
  validateBody(sendOtpSchema),
  async (req, res, next) => {
    try {
      const data = await PaymentService.sendVerificationOtp(
        req.auth!.userId,
        req.body.provider,
        req.body.accountNumber
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

paymentRouter.post(
  '/verify-online',
  authenticate,
  requireRole('customer'),
  validateBody(verifyOnlineSchema),
  async (req, res, next) => {
    try {
      const data = await PaymentService.verifyOnlinePayment(req.auth!.userId, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

paymentRouter.post(
  '/initiate',
  authenticate,
  requireRole('customer'),
  validateBody(initiateSchema),
  async (req, res, next) => {
    try {
      const data = await PaymentService.initiatePayment(
        req.auth!.userId,
        req.body.orderId,
        req.body.provider
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

paymentRouter.post('/webhook/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider as OnlineProvider;
    const signature = String(req.headers['x-webhook-signature'] ?? '');
    const rawBody = JSON.stringify(req.body);
    const data = await PaymentService.processWebhook({
      provider,
      rawBody,
      signature,
      event: req.body,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

paymentRouter.post(
  '/refunds',
  authenticate,
  requireRole('customer'),
  validateBody(refundRequestSchema),
  async (req, res, next) => {
    try {
      const data = await PaymentService.requestRefund(
        req.auth!.userId,
        req.body.orderId,
        req.body.reason
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

paymentRouter.get('/order/:orderId', authenticate, async (req, res, next) => {
  try {
    const payment = await PaymentModel.findOne({
      orderId: req.params.orderId,
      customerId: req.auth!.userId,
    }).lean();
    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});
