import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { AppSettingModel, CategoryModel } from '../src/models/index.js';

const INITIAL_GLOBAL_CATEGORIES = [
  { name: 'Burgers', nameUr: 'برگر', slug: 'burgers', sortOrder: 1 },
  { name: 'Pizza', nameUr: 'پیزا', slug: 'pizza', sortOrder: 2 },
  { name: 'Biryani', nameUr: 'بریانی', slug: 'biryani', sortOrder: 3 },
  { name: 'BBQ', nameUr: 'باربی کیو', slug: 'bbq', sortOrder: 4 },
  { name: 'Chinese', nameUr: 'چائنیز', slug: 'chinese', sortOrder: 5 },
  { name: 'Fast Food', nameUr: 'فاسٹ فوڈ', slug: 'fast-food', sortOrder: 6 },
  { name: 'Sandwiches', nameUr: 'سینڈوچ', slug: 'sandwiches', sortOrder: 7 },
  { name: 'Shawarma', nameUr: 'شوارما', slug: 'shawarma', sortOrder: 8 },
  { name: 'Desserts', nameUr: 'میٹھا', slug: 'desserts', sortOrder: 9 },
  { name: 'Ice Cream', nameUr: 'آئس کریم', slug: 'ice-cream', sortOrder: 10 },
  { name: 'Drinks', nameUr: 'مشروبات', slug: 'drinks', sortOrder: 11 },
  { name: 'Traditional Food', nameUr: 'روایتی کھانے', slug: 'traditional-food', sortOrder: 12 },
  { name: 'Healthy Food', nameUr: 'صحت بخش کھانے', slug: 'healthy-food', sortOrder: 13 },
  { name: 'Breakfast', nameUr: 'ناشتہ', slug: 'breakfast', sortOrder: 14 },
];

async function seedReferenceData() {
  await connectDatabase();
  try {
    for (const cat of INITIAL_GLOBAL_CATEGORIES) {
      await CategoryModel.updateOne(
        { slug: cat.slug },
        { $setOnInsert: { ...cat, isActive: true } },
        { upsert: true }
      );
    }

    await AppSettingModel.updateOne(
      { key: 'platform_config' },
      {
        $setOnInsert: {
          key: 'platform_config',
          appName: 'ZestRoute',
          defaultCurrency: 'PKR',
          taxBps: 0,
          defaultCommissionBps: 1500,
          baseDeliveryFeeMinor: 12000,
          minOrderMinor: 30000,
          festivalMode: 'none',
          supportEmail: 'support@zestroute.app',
        },
      },
      { upsert: true }
    );

    console.log('Legitimate reference data seeded (14 global categories + platform_config).');
  } finally {
    await disconnectDatabase();
  }
}

seedReferenceData().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
