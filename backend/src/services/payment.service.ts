import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  NotificationModel,
  OrderModel,
  PaymentModel,
  PaymentTransactionModel,
  RefundModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { generateNumericOtp, hashToken } from '../utils/crypto.js';

export type OnlineProvider = 'jazzcash' | 'easypaisa' | 'card';

const pendingPaymentOtps = new Map<string, { hash: string; expiresAt: number }>();

function getProviderSecret(provider: OnlineProvider): string | undefined {
  if (provider === 'jazzcash') return process.env.JAZZCASH_INTEGRITY_SALT;
  if (provider === 'easypaisa') return process.env.EASYPAISA_SECRET_KEY;
  if (provider === 'card') return process.env.CARD_GATEWAY_WEBHOOK_SECRET;
  return undefined;
}

function isProviderConfigured(provider: OnlineProvider): boolean {
  if (provider === 'jazzcash') {
    return Boolean(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_INTEGRITY_SALT);
  }
  if (provider === 'easypaisa') {
    return Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_SECRET_KEY);
  }
  return Boolean(process.env.CARD_GATEWAY_SECRET_KEY && process.env.CARD_GATEWAY_WEBHOOK_SECRET);
}

export class PaymentService {
  static verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  static async sendVerificationOtp(customerId: string, provider: OnlineProvider, accountNumber: string) {
    const cleanAcc = accountNumber.trim();
    if (cleanAcc.length < 4) {
      throw new AppError(400, 'INVALID_ACCOUNT', 'Please enter a valid account or mobile number');
    }
    const otp = generateNumericOtp(6);
    const key = `${customerId}:${provider}`;
    pendingPaymentOtps.set(key, {
      hash: hashToken(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return {
      sent: true,
      provider,
      maskedAccount: cleanAcc.length > 4 ? `****${cleanAcc.slice(-4)}` : cleanAcc,
      devOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
    };
  }

  static async verifyOnlinePayment(
    customerId: string,
    input: {
      orderId: string;
      provider: OnlineProvider;
      accountNumber: string;
      transactionRef: string;
      otpCode: string;
    }
  ) {
    const key = `${customerId}:${input.provider}`;
    const storedOtp = pendingPaymentOtps.get(key);
    if (!storedOtp || storedOtp.expiresAt < Date.now()) {
      throw new AppError(400, 'OTP_EXPIRED', 'Verification OTP expired. Please request a new OTP.');
    }
    if (storedOtp.hash !== hashToken(input.otpCode.trim())) {
      throw new AppError(400, 'INVALID_OTP', 'Invalid 6-digit verification OTP.');
    }

    const order = await OrderModel.findOne({ _id: input.orderId, customerId });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.paymentStatus === 'paid') {
      return { verified: true, paymentStatus: 'paid', orderNumber: order.orderNumber };
    }

    const providerTxId = `${input.provider.toUpperCase()}-${input.transactionRef.trim().toUpperCase()}`;
    const duplicate = await PaymentTransactionModel.findOne({ providerTxId }).lean();
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_TX_REF', 'This transaction reference has already been used');
    }

    let payment = await PaymentModel.findOne({ orderId: order._id });
    if (!payment) {
      payment = await PaymentModel.create({
        orderId: order._id,
        customerId: order.customerId,
        method: input.provider,
        amountMinor: order.totalMinor,
        currency: order.currency,
        status: 'pending',
      });
    }

    const cleanAcc = input.accountNumber.trim();
    const maskedAcc = cleanAcc.length > 4 ? `****${cleanAcc.slice(-4)}` : cleanAcc;

    await PaymentTransactionModel.create({
      paymentId: payment._id,
      providerTxId,
      eventType: 'online_verified',
      amountMinor: payment.amountMinor,
      status: 'paid',
      rawWebhookPayload: {
        provider: input.provider,
        maskedAccount: maskedAcc,
        transactionRef: input.transactionRef.trim(),
      },
      verifiedAt: new Date(),
    });

    payment.status = 'paid';
    await payment.save();

    order.paymentStatus = 'paid';
    await order.save();

    pendingPaymentOtps.delete(key);

    await NotificationModel.create({
      userId: customerId,
      type: 'payment_verified',
      title: `Payment Verified (${order.orderNumber})`,
      body: `Your ${input.provider.toUpperCase()} payment (${providerTxId}) of ${order.currency} ${(order.totalMinor / 100).toFixed(2)} is confirmed.`,
      data: { orderId: String(order._id) },
    }).catch(() => {});

    return {
      verified: true,
      paymentStatus: 'paid',
      providerTxId,
      orderNumber: order.orderNumber,
    };
  }

  static async initiatePayment(customerId: string, orderId: string, provider: OnlineProvider) {
    if (!isProviderConfigured(provider)) {
      throw new AppError(
        503,
        'GATEWAY_NOT_CONFIGURED',
        `${provider} credentials are not configured in backend/.env`
      );
    }

    const order = await OrderModel.findOne({ _id: orderId, customerId }).lean();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    const payment = await PaymentModel.findOne({ orderId: order._id }).lean();
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
    if (payment.status === 'paid') {
      throw new AppError(409, 'ALREADY_PAID', 'Order is already paid');
    }

    return {
      paymentId: String(payment._id),
      orderNumber: order.orderNumber,
      provider,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: 'pending_gateway_redirect',
    };
  }

  static async processWebhook(params: {
    provider: OnlineProvider;
    rawBody: string;
    signature: string;
    event: {
      paymentId: string;
      providerTxId: string;
      status: 'paid' | 'failed';
      amountMinor: number;
    };
  }) {
    const secret = getProviderSecret(params.provider);
    if (!secret) {
      throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Webhook secret not configured');
    }

    if (!this.verifyHmacSignature(params.rawBody, params.signature, secret)) {
      throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid payment webhook signature');
    }

    const duplicate = await PaymentTransactionModel.findOne({
      providerTxId: params.event.providerTxId,
    }).lean();
    if (duplicate) {
      return { idempotent: true, status: duplicate.status };
    }

    const payment = await PaymentModel.findById(params.event.paymentId);
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    if (params.event.amountMinor !== payment.amountMinor) {
      throw new AppError(400, 'AMOUNT_MISMATCH', 'Webhook amount does not match order payment');
    }

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await PaymentTransactionModel.create(
        [
          {
            paymentId: payment._id,
            providerTxId: params.event.providerTxId,
            eventType: `webhook.${params.provider}.${params.event.status}`,
            amountMinor: params.event.amountMinor,
            status: params.event.status,
            verifiedAt: new Date(),
          },
        ],
        { session }
      );

      payment.status = params.event.status;
      await payment.save({ session });

      await OrderModel.updateOne(
        { _id: payment.orderId },
        { $set: { paymentStatus: params.event.status } },
        { session }
      );
    });
    await session.endSession();

    return { idempotent: false, status: params.event.status };
  }

  static async requestRefund(customerId: string, orderId: string, reason: string) {
    const [order, payment] = await Promise.all([
      OrderModel.findOne({ _id: orderId, customerId }).lean(),
      PaymentModel.findOne({ orderId, customerId }).lean(),
    ]);

    if (!order || !payment) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order or payment not found');
    if (payment.status !== 'paid') {
      throw new AppError(400, 'REFUND_NOT_ELIGIBLE', 'Only paid orders can be refunded');
    }

    return RefundModel.create({
      orderId: order._id,
      paymentId: payment._id,
      customerId,
      amountMinor: payment.amountMinor,
      reason,
      status: 'requested',
    });
  }
}
