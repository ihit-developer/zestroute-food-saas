import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  CustomerWalletModel,
  LoyaltyAccountModel,
  ProfileModel,
  RiderModel,
  UserPreferenceModel,
  UserRoleModel,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/crypto.js';

const DEV_ACCOUNTS = [
  {
    fullName: 'Dev Super Admin',
    email: 'admin@zestroute.app',
    phone: '03000000001',
    password: 'AdminPass#2026!',
    role: 'super_admin' as const,
  },
  {
    fullName: 'Dev Restaurant Owner',
    email: 'catalog-partner@zestroute.app',
    phone: '03000000002',
    password: 'PartnerKitchen#2026!',
    role: 'restaurant_owner' as const,
  },
  {
    fullName: 'Dev Customer',
    email: 'customer@zestroute.app',
    phone: '03000000003',
    password: 'CustomerPass#2026!',
    role: 'customer' as const,
  },
  {
    fullName: 'Dev Approved Rider',
    email: 'rider@zestroute.app',
    phone: '03000000004',
    password: 'RiderPass#2026!',
    role: 'rider' as const,
  },
];

async function seedDevAccounts() {
  await connectDatabase();
  try {
    for (const acc of DEV_ACCOUNTS) {
      const passwordHash = await hashPassword(acc.password);
      let profile = await ProfileModel.findOne({ email: acc.email });
      if (!profile) {
        profile = await ProfileModel.create({
          fullName: acc.fullName,
          email: acc.email,
          phone: acc.phone,
          passwordHash,
          accountStatus: 'active',
        });
      } else {
        profile.passwordHash = passwordHash;
        profile.phone = profile.phone ?? acc.phone;
        profile.accountStatus = 'active';
        await profile.save();
      }

      await UserRoleModel.updateOne(
        { userId: profile._id, role: acc.role },
        { $setOnInsert: { userId: profile._id, role: acc.role } },
        { upsert: true }
      );
      await UserPreferenceModel.updateOne(
        { userId: profile._id },
        { $setOnInsert: { userId: profile._id } },
        { upsert: true }
      );

      if (acc.role === 'customer') {
        await CustomerWalletModel.updateOne(
          { customerId: profile._id },
          { $setOnInsert: { customerId: profile._id, balanceMinor: 0 } },
          { upsert: true }
        );
        await LoyaltyAccountModel.updateOne(
          { customerId: profile._id },
          { $setOnInsert: { customerId: profile._id, pointsBalance: 0 } },
          { upsert: true }
        );
      }

      if (acc.role === 'rider') {
        await RiderModel.updateOne(
          { userId: profile._id },
          {
            $setOnInsert: {
              userId: profile._id,
              vehicleType: 'bike',
              vehicleNumber: 'LEA-2026',
              cnicMasked: '35202-*******-1',
              licenseNumber: 'DL-DEV-2026',
              status: 'approved',
              isOnline: true,
            },
          },
          { upsert: true }
        );
      }
    }
    console.log('Development login accounts ready for all 4 roles.');
  } finally {
    await disconnectDatabase();
  }
}

seedDevAccounts().catch((err) => {
  console.error('Dev account seed failed:', err);
  process.exit(1);
});
