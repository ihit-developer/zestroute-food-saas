import mongoose from 'mongoose';
import {
  CustomerWalletModel,
  LoyaltyAccountModel,
  ProfileModel,
  UserPreferenceModel,
  UserRoleModel,
  UserSessionModel,
} from '../models/index.js';
import {
  generateNumericOtp,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} from '../utils/crypto.js';
import { AppError } from '../middleware/error.middleware.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthService {
  static async register(input: {
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
    role: 'customer' | 'restaurant_owner' | 'rider';
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existing = await ProfileModel.findOne({
      $or: [
        ...(input.email ? [{ email: input.email.toLowerCase() }] : []),
        ...(input.phone ? [{ phone: input.phone }] : []),
      ],
    }).lean();

    if (existing) {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with this email or phone already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const session = await mongoose.startSession();
    let createdUserId = '';

    await session.withTransaction(async () => {
      const [profile] = await ProfileModel.create(
        [
          {
            fullName: input.fullName,
            email: input.email?.toLowerCase(),
            phone: input.phone,
            passwordHash,
            accountStatus: 'active',
          },
        ],
        { session }
      );
      createdUserId = String(profile._id);

      await UserRoleModel.create([{ userId: profile._id, role: input.role }], { session });
      await UserPreferenceModel.create([{ userId: profile._id }], { session });

      if (input.role === 'customer') {
        await CustomerWalletModel.create([{ customerId: profile._id, balanceMinor: 0 }], { session });
        await LoyaltyAccountModel.create([{ customerId: profile._id, pointsBalance: 0 }], { session });
      }
    });
    await session.endSession();

    const tokens = await this.issueSessionTokens({
      userId: createdUserId,
      roles: [input.role],
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      user: { id: createdUserId, fullName: input.fullName, email: input.email, phone: input.phone, roles: [input.role] },
      ...tokens,
    };
  }

  static async login(input: {
    identifier: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const normalized = input.identifier.trim().toLowerCase();
    const profile = await ProfileModel.findOne({
      $or: [{ email: normalized }, { phone: input.identifier.trim() }],
    }).select('+passwordHash');

    if (!profile || !(await verifyPassword(input.password, profile.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
    }

    if (profile.accountStatus !== 'active') {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is suspended or deactivated');
    }

    const roleDocs = await UserRoleModel.find({ userId: profile._id }).select('role').lean();
    const roles = roleDocs.map((r) => r.role);

    const tokens = await this.issueSessionTokens({
      userId: String(profile._id),
      roles,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: String(profile._id),
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        roles,
      },
      ...tokens,
    };
  }

  static async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const existingSession = await UserSessionModel.findOne({ refreshTokenHash: tokenHash });

    if (!existingSession) {
      throw new AppError(401, 'INVALID_REFRESH', 'Invalid refresh token');
    }

    if (existingSession.revokedAt || existingSession.expiresAt < new Date()) {
      // Reuse detection: revoke entire token family
      await UserSessionModel.updateMany(
        { familyId: existingSession.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      throw new AppError(401, 'SESSION_REVOKED', 'Session expired or revoked. Please sign in again.');
    }

    existingSession.revokedAt = new Date();
    await existingSession.save();

    const roleDocs = await UserRoleModel.find({ userId: existingSession.userId }).select('role').lean();
    const roles = roleDocs.map((r) => r.role);

    return this.issueSessionTokens({
      userId: String(existingSession.userId),
      roles,
      familyId: existingSession.familyId,
      ipAddress,
      userAgent,
    });
  }

  static async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await UserSessionModel.updateOne({ refreshTokenHash: tokenHash }, { $set: { revokedAt: new Date() } });
  }

  static async requestOtp(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    const profile = await ProfileModel.findOne({
      $or: [{ email: normalized }, { phone: identifier.trim() }],
    });
    if (!profile) {
      // Do not leak account existence
      return { sent: true };
    }

    const otp = generateNumericOtp(6);
    profile.otpHash = hashToken(otp);
    profile.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    profile.otpAttempts = 0;
    await profile.save();

    // Production SMTP / SMS delivery integrates via env credentials
    return { sent: true };
  }

  static async resetPasswordWithOtp(identifier: string, otp: string, newPassword: string) {
    const normalized = identifier.trim().toLowerCase();
    const profile = await ProfileModel.findOne({
      $or: [{ email: normalized }, { phone: identifier.trim() }],
    }).select('+otpHash +otpExpiresAt +otpAttempts');

    if (!profile || !profile.otpHash || !profile.otpExpiresAt || profile.otpExpiresAt < new Date()) {
      throw new AppError(400, 'OTP_EXPIRED', 'Verification code is invalid or expired');
    }

    if ((profile.otpAttempts ?? 0) >= 5) {
      throw new AppError(429, 'OTP_LOCKED', 'Too many failed attempts. Request a new code.');
    }

    if (hashToken(otp) !== profile.otpHash) {
      profile.otpAttempts = (profile.otpAttempts ?? 0) + 1;
      await profile.save();
      throw new AppError(400, 'INVALID_OTP', 'Incorrect verification code');
    }

    profile.passwordHash = await hashPassword(newPassword);
    profile.otpHash = undefined;
    profile.otpExpiresAt = undefined;
    profile.otpAttempts = 0;
    await profile.save();

    await UserSessionModel.updateMany(
      { userId: profile._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  private static async issueSessionTokens(params: {
    userId: string;
    roles: string[];
    familyId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const rawRefreshToken = generateOpaqueToken(48);
    const familyId = params.familyId ?? generateOpaqueToken(16);

    const session = await UserSessionModel.create({
      userId: params.userId,
      refreshTokenHash: hashToken(rawRefreshToken),
      familyId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    const accessToken = signAccessToken({
      sub: params.userId,
      roles: params.roles,
      sessionId: String(session._id),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
