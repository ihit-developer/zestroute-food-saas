import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  CategoryModel,
  FoodImageModel,
  FoodItemModel,
  ProfileModel,
  RestaurantBranchModel,
  RestaurantCategoryModel,
  RestaurantModel,
  UserRoleModel,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/crypto.js';

const CATEGORY_IMAGES: Record<string, string> = {
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
  bbq: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  chinese: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80',
  'fast-food': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  sandwiches: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  shawarma: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&q=80',
  desserts: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
  'ice-cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80',
  drinks: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
  'traditional-food': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80',
  'healthy-food': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
};

const CATALOG_RESTAURANTS = [
  {
    name: 'Charcoal & Flame Grill',
    slug: 'charcoal-flame-grill',
    description: 'Authentic wood-fired BBQ, burgers, and traditional platters.',
    cuisineTypes: ['BBQ', 'Burgers', 'Traditional Food'],
    city: 'Lahore',
    area: 'Gulberg III',
    address: 'Plot 14, MM Alam Road',
    coords: [74.3587, 31.5102],
  },
  {
    name: 'Crust & Oven Pizzeria',
    slug: 'crust-oven-pizzeria',
    description: 'Stone-baked artisan pizzas, calzones, and gourmet sandwiches.',
    cuisineTypes: ['Pizza', 'Fast Food', 'Sandwiches'],
    city: 'Lahore',
    area: 'DHA Phase 5',
    address: 'Commercial Sector C',
    coords: [74.4126, 31.4697],
  },
  {
    name: 'Saffron Pot Biryani & Karahi',
    slug: 'saffron-pot-biryani',
    description: 'Slow-cooked Sindhi & Bombay biryani, karahi, and breakfast specials.',
    cuisineTypes: ['Biryani', 'Traditional Food', 'Breakfast'],
    city: 'Karachi',
    area: 'Clifton Block 5',
    address: 'Main Boat Basin Road',
    coords: [67.0285, 24.8138],
  },
  {
    name: 'Wok & Roll Express',
    slug: 'wok-roll-express',
    description: 'Freshly tossed Chinese bowls, shawarma wraps, and healthy salads.',
    cuisineTypes: ['Chinese', 'Shawarma', 'Healthy Food'],
    city: 'Islamabad',
    area: 'F-7 Markaz',
    address: 'Jinnah Super Market',
    coords: [73.0551, 33.7215],
  },
  {
    name: 'Velvet Scoop & Sips',
    slug: 'velvet-scoop-sips',
    description: 'Artisanal ice creams, warm desserts, and fresh craft beverages.',
    cuisineTypes: ['Desserts', 'Ice Cream', 'Drinks'],
    city: 'Lahore',
    area: 'Model Town',
    address: 'Link Road',
    coords: [74.3239, 31.4839],
  },
];

// 50 Menu Items mapped to Global Categories & Restaurants
const MENU_ITEMS_50: Array<{
  name: string;
  categorySlug: string;
  restIdx: number;
  priceMinor: number;
  discountMinor?: number;
  prep: number;
  desc: string;
  ingredients: string[];
}> = [
  // Burgers (5)
  { name: 'Zinger Crunch Burger', categorySlug: 'burgers', restIdx: 0, priceMinor: 65000, discountMinor: 55000, prep: 15, desc: 'Crispy thigh fillet, cheddar, iceberg, chipotle mayo', ingredients: ['Chicken', 'Cheddar', 'Brioche Bun'] },
  { name: 'Double Smash Beef Burger', categorySlug: 'burgers', restIdx: 0, priceMinor: 89000, prep: 18, desc: 'Two seared beef patties, caramelized onions, house sauce', ingredients: ['Beef', 'Cheese', 'Pickles'] },
  { name: 'Smoky BBQ Brisket Burger', categorySlug: 'burgers', restIdx: 0, priceMinor: 95000, prep: 20, desc: 'Slow-smoked beef brisket with hickory BBQ glaze', ingredients: ['Beef Brisket', 'BBQ Sauce'] },
  { name: 'Jalapeno Swiss Melt', categorySlug: 'burgers', restIdx: 1, priceMinor: 72000, prep: 15, desc: 'Grilled chicken patty topped with Swiss cheese & jalapenos', ingredients: ['Chicken', 'Swiss Cheese', 'Jalapenos'] },
  { name: 'Classic Cheeseburger', categorySlug: 'burgers', restIdx: 1, priceMinor: 55000, discountMinor: 49000, prep: 12, desc: 'Juicy beef patty with American cheddar and mustard', ingredients: ['Beef', 'Cheddar'] },

  // Pizza (5)
  { name: 'Chicken Tikka Pizza (Medium)', categorySlug: 'pizza', restIdx: 1, priceMinor: 145000, discountMinor: 125000, prep: 22, desc: 'Smoky tikka chunks, red onions, mozzarella on hand-tossed crust', ingredients: ['Mozzarella', 'Chicken Tikka', 'Onions'] },
  { name: 'Fajita Sicilian Pizza (Large)', categorySlug: 'pizza', restIdx: 1, priceMinor: 195000, prep: 25, desc: 'Spiced fajita chicken, bell peppers, olives, jalapenos', ingredients: ['Chicken', 'Capsicum', 'Olives'] },
  { name: 'Pepperoni Classic Pizza', categorySlug: 'pizza', restIdx: 1, priceMinor: 165000, prep: 20, desc: 'Beef pepperoni slices over San Marzano tomato sauce', ingredients: ['Beef Pepperoni', 'Mozzarella'] },
  { name: 'Four Cheese Margherita', categorySlug: 'pizza', restIdx: 1, priceMinor: 135000, prep: 18, desc: 'Mozzarella, cheddar, parmesan, feta & fresh basil', ingredients: ['4 Cheeses', 'Basil'] },
  { name: 'Behari Kabab Crown Crust', categorySlug: 'pizza', restIdx: 1, priceMinor: 210000, prep: 25, desc: 'Seekh kabab stuffed crust with Behari chicken topping', ingredients: ['Seekh Kabab', 'Chicken', 'Cheese'] },

  // Biryani (4)
  { name: 'Special Chicken Sindhi Biryani', categorySlug: 'biryani', restIdx: 2, priceMinor: 52000, discountMinor: 46000, prep: 15, desc: 'Aromatic basmati rice layered with spiced chicken & potatoes', ingredients: ['Basmati Rice', 'Chicken', 'Saffron'] },
  { name: 'Mutton Dum Biryani', categorySlug: 'biryani', restIdx: 2, priceMinor: 98000, prep: 20, desc: 'Slow-steamed tender mutton biryani served with raita', ingredients: ['Mutton', 'Basmati Rice', 'Mint'] },
  { name: 'Beef Nalli Biryani', categorySlug: 'biryani', restIdx: 2, priceMinor: 89000, prep: 20, desc: 'Rich marrow beef biryani cooked in traditional deg', ingredients: ['Beef', 'Basmati Rice', 'Spices'] },
  { name: 'Chicken Tikka Biryani', categorySlug: 'biryani', restIdx: 2, priceMinor: 58000, prep: 15, desc: 'Charcoal-grilled tikka piece over fragrant masala rice', ingredients: ['Chicken Tikka', 'Rice'] },

  // BBQ (4)
  { name: 'Chicken Malai Boti (8 pcs)', categorySlug: 'bbq', restIdx: 0, priceMinor: 78000, prep: 20, desc: 'Creamy marinated boneless chicken grilled over charcoal', ingredients: ['Chicken', 'Cream', 'Spices'] },
  { name: 'Beef Seekh Kabab (4 pcs)', categorySlug: 'bbq', restIdx: 0, priceMinor: 68000, prep: 18, desc: 'Hand-minced spiced beef skewers with mint chutney', ingredients: ['Beef', 'Coriander', 'Mint'] },
  { name: 'Reshmi Chicken Kabab', categorySlug: 'bbq', restIdx: 0, priceMinor: 72000, prep: 18, desc: 'Silky spiced chicken skewers brushed with butter', ingredients: ['Chicken', 'Butter'] },
  { name: 'Mixed BBQ Family Platter', categorySlug: 'bbq', restIdx: 0, priceMinor: 285000, discountMinor: 255000, prep: 30, desc: 'Malai boti, seekh kabab, tikka, naan & chutneys', ingredients: ['Chicken', 'Beef', 'Naan'] },

  // Chinese (4)
  { name: 'Chicken Manchurian with Fried Rice', categorySlug: 'chinese', restIdx: 3, priceMinor: 79000, prep: 18, desc: 'Tangy garlic-tomato chicken served with egg fried rice', ingredients: ['Chicken', 'Egg Fried Rice'] },
  { name: 'Beef Chilli Dry with Rice', categorySlug: 'chinese', restIdx: 3, priceMinor: 92000, prep: 20, desc: 'Crispy julienne beef tossed with green chillies & ginger', ingredients: ['Beef', 'Green Chilli', 'Ginger'] },
  { name: 'Kung Pao Chicken Bowl', categorySlug: 'chinese', restIdx: 3, priceMinor: 84000, prep: 18, desc: 'Wok-seared chicken with roasted peanuts & bell peppers', ingredients: ['Chicken', 'Peanuts', 'Capsicum'] },
  { name: 'Chicken Chow Mein', categorySlug: 'chinese', restIdx: 3, priceMinor: 75000, discountMinor: 68000, prep: 15, desc: 'Stir-fried egg noodles with chicken and crisp veggies', ingredients: ['Noodles', 'Chicken', 'Cabbage'] },

  // Fast Food (4)
  { name: 'Loaded Cheese Fries', categorySlug: 'fast-food', restIdx: 1, priceMinor: 45000, prep: 10, desc: 'Crispy skin-on fries topped with cheddar sauce & jalapenos', ingredients: ['Potatoes', 'Cheddar'] },
  { name: 'Crispy Chicken Tenders (6 pcs)', categorySlug: 'fast-food', restIdx: 0, priceMinor: 62000, prep: 14, desc: 'Golden breaded chicken strips with honey mustard dip', ingredients: ['Chicken', 'Honey Mustard'] },
  { name: 'Spicy Peri Peri Wings (8 pcs)', categorySlug: 'fast-food', restIdx: 0, priceMinor: 69000, prep: 16, desc: 'Flame-grilled wings glazed in peri peri sauce', ingredients: ['Chicken Wings', 'Peri Peri'] },
  { name: 'Mozzarella Sticks (6 pcs)', categorySlug: 'fast-food', restIdx: 1, priceMinor: 48000, prep: 10, desc: 'Herb-breaded mozzarella served with marinara', ingredients: ['Mozzarella', 'Marinara'] },

  // Sandwiches (3)
  { name: 'Classic Club Sandwich', categorySlug: 'sandwiches', restIdx: 1, priceMinor: 64000, prep: 14, desc: 'Triple-decker toasted sandwich with grilled chicken, egg & fries', ingredients: ['Chicken', 'Egg', 'Toast'] },
  { name: 'Grilled Panini Fajita', categorySlug: 'sandwiches', restIdx: 1, priceMinor: 68000, prep: 15, desc: 'Pressed sourdough panini with fajita chicken & mozzarella', ingredients: ['Sourdough', 'Chicken', 'Cheese'] },
  { name: 'Smoked Turkey & Cheddar Melt', categorySlug: 'sandwiches', restIdx: 3, priceMinor: 74000, prep: 12, desc: 'Warm artisan ciabatta with smoked turkey & honey mustard', ingredients: ['Turkey', 'Cheddar', 'Ciabatta'] },

  // Shawarma (3)
  { name: 'Lebanese Chicken Shawarma', categorySlug: 'shawarma', restIdx: 3, priceMinor: 38000, discountMinor: 34000, prep: 10, desc: 'Spit-roasted chicken wrapped in pita with garlic toum & pickles', ingredients: ['Chicken', 'Pita', 'Garlic Sauce'] },
  { name: 'Zinger Paratha Roll', categorySlug: 'shawarma', restIdx: 0, priceMinor: 42000, prep: 12, desc: 'Flaky paratha stuffed with crispy zinger & chipotle sauce', ingredients: ['Paratha', 'Crispy Chicken'] },
  { name: 'Arabic Platter Shawarma', categorySlug: 'shawarma', restIdx: 3, priceMinor: 65000, prep: 15, desc: 'Sliced shawarma, fries, hummus, pickles & warm pita', ingredients: ['Chicken', 'Hummus', 'Pita'] },

  // Desserts (3)
  { name: 'Warm Chocolate Lava Cake', categorySlug: 'desserts', restIdx: 4, priceMinor: 52000, prep: 14, desc: 'Molten dark chocolate cake served with vanilla scoop', ingredients: ['Dark Chocolate', 'Vanilla Ice Cream'] },
  { name: 'Classic Lotus Cheesecake', categorySlug: 'desserts', restIdx: 4, priceMinor: 59000, prep: 8, desc: 'Creamy baked cheesecake topped with Biscoff spread', ingredients: ['Cream Cheese', 'Lotus Biscoff'] },
  { name: 'Shahi Gulab Jamun (4 pcs)', categorySlug: 'desserts', restIdx: 2, priceMinor: 32000, prep: 8, desc: 'Warm milk dumplings soaked in cardamom rose syrup', ingredients: ['Khoya', 'Cardamom', 'Pistachio'] },

  // Ice Cream (3)
  { name: 'Belgian Dark Chocolate Tub', categorySlug: 'ice-cream', restIdx: 4, priceMinor: 48000, prep: 5, desc: 'Rich double-scoop Belgian chocolate gelato', ingredients: ['Belgian Cocoa', 'Cream'] },
  { name: 'Peshawari Pistachio Kulfi', categorySlug: 'ice-cream', restIdx: 4, priceMinor: 35000, prep: 5, desc: 'Traditional dense milk kulfi loaded with pistachios', ingredients: ['Milk', 'Pistachio'] },
  { name: 'Salted Caramel Crunch Sundae', categorySlug: 'ice-cream', restIdx: 4, priceMinor: 49000, discountMinor: 42000, prep: 6, desc: 'Caramel swirl ice cream with praline almonds', ingredients: ['Caramel', 'Almonds'] },

  // Drinks (4)
  { name: 'Mint Margarita', categorySlug: 'drinks', restIdx: 4, priceMinor: 29000, prep: 5, desc: 'Chilled blended mint, fresh lime & soda', ingredients: ['Mint', 'Lime', 'Soda'] },
  { name: 'Mango Lassi', categorySlug: 'drinks', restIdx: 2, priceMinor: 31000, prep: 5, desc: 'Sweet Chaunsa mango blended with creamy yogurt', ingredients: ['Mango', 'Yogurt'] },
  { name: 'Iced Caramel Latte', categorySlug: 'drinks', restIdx: 4, priceMinor: 46000, prep: 6, desc: 'Double espresso over cold milk and caramel drizzle', ingredients: ['Espresso', 'Milk', 'Caramel'] },
  { name: 'Fresh Peach Iced Tea', categorySlug: 'drinks', restIdx: 4, priceMinor: 32000, prep: 5, desc: 'Brewed black tea infused with peach puree', ingredients: ['Black Tea', 'Peach'] },

  // Traditional Food (3)
  { name: 'Chicken Makhni Karahi (Half)', categorySlug: 'traditional-food', restIdx: 2, priceMinor: 125000, prep: 25, desc: 'Rich tomato-butter wok-cooked chicken karahi with ginger', ingredients: ['Chicken', 'Butter', 'Tomatoes'] },
  { name: 'Beef Nihari Special', categorySlug: 'traditional-food', restIdx: 2, priceMinor: 85000, prep: 15, desc: 'Slow-simmered shank stew garnished with ginger & lemon', ingredients: ['Beef Shank', 'Spices'] },
  { name: 'Mutton Peshawari Karahi', categorySlug: 'traditional-food', restIdx: 0, priceMinor: 215000, prep: 30, desc: 'Traditional salted mutton karahi cooked in fresh tomatoes', ingredients: ['Mutton', 'Tomatoes', 'Black Pepper'] },

  // Healthy Food (3)
  { name: 'Grilled Chicken Caesar Salad', categorySlug: 'healthy-food', restIdx: 3, priceMinor: 68000, prep: 12, desc: 'Romaine lettuce, grilled chicken, parmesan & light dressing', ingredients: ['Romaine', 'Chicken Breast', 'Parmesan'] },
  { name: 'Quinoa & Avocado Power Bowl', categorySlug: 'healthy-food', restIdx: 3, priceMinor: 79000, prep: 14, desc: 'Tri-color quinoa, roasted chickpeas, avocado & herb lemon', ingredients: ['Quinoa', 'Avocado', 'Chickpeas'] },
  { name: 'Herb Grilled Salmon Plate', categorySlug: 'healthy-food', restIdx: 3, priceMinor: 165000, prep: 20, desc: 'Pan-seared salmon with steamed broccoli and brown rice', ingredients: ['Salmon', 'Broccoli', 'Brown Rice'] },

  // Breakfast (2) -> Total = 50 items!
  { name: 'Halwa Puri Nashta Platter', categorySlug: 'breakfast', restIdx: 2, priceMinor: 42000, prep: 15, desc: '4 crisp puris, suji halwa, chana masala & aloo tarkari', ingredients: ['Flour', 'Semolina', 'Chickpeas'] },
  { name: 'Cheese Omelette & Paratha', categorySlug: 'breakfast', restIdx: 2, priceMinor: 35000, prep: 12, desc: 'Fluffy 3-egg cheddar omelette with flaky whole-wheat paratha', ingredients: ['Eggs', 'Cheddar', 'Paratha'] },
];

async function seedSampleCatalog() {
  await connectDatabase();
  try {
    console.log(`Preparing to seed ${MENU_ITEMS_50.length} menu items across 14 global categories...`);

    const categories = await CategoryModel.find().lean();
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));

    // Ensure a dedicated catalog owner profile exists (no fake orders/finance)
    let owner = await ProfileModel.findOne({ email: 'catalog-partner@zestroute.app' });
    if (!owner) {
      owner = await ProfileModel.create({
        fullName: 'ZestRoute Partner Kitchens',
        email: 'catalog-partner@zestroute.app',
        passwordHash: await hashPassword('PartnerKitchen#2026!'),
        accountStatus: 'active',
      });
      await UserRoleModel.updateOne(
        { userId: owner._id, role: 'restaurant_owner' },
        { $setOnInsert: { userId: owner._id, role: 'restaurant_owner' } },
        { upsert: true }
      );
    }

    for (const cat of categories) {
      const img = CATEGORY_IMAGES[cat.slug];
      if (img && !cat.imageUrl) {
        await CategoryModel.updateOne({ _id: cat._id }, { $set: { imageUrl: img } });
      }
    }

    const restaurants: Array<{ id: unknown; branchId: unknown; restCatBySlug: Map<string, unknown> }> = [];

    for (const r of CATALOG_RESTAURANTS) {
      const coverUrl = CATEGORY_IMAGES[r.cuisineTypes[0]?.toLowerCase().replace(/\s+/g, '-') ?? 'burgers'] ?? CATEGORY_IMAGES.burgers;
      const restDoc = await RestaurantModel.findOneAndUpdate(
        { slug: r.slug },
        {
          $setOnInsert: {
            ownerId: owner._id,
            name: r.name,
            slug: r.slug,
            description: r.description,
            cuisineTypes: r.cuisineTypes,
            status: 'approved',
            ratingAvg: 4.7,
            ratingCount: 120,
          },
          $set: { coverUrl, logoUrl: coverUrl },
        },
        { upsert: true, new: true }
      );

      let branch = await RestaurantBranchModel.findOne({ restaurantId: restDoc._id });
      if (!branch) {
        branch = await RestaurantBranchModel.create({
          restaurantId: restDoc._id,
          name: `${r.name} — ${r.area}`,
          address: r.address,
          city: r.city,
          area: r.area,
          location: { type: 'Point', coordinates: r.coords },
          isActive: true,
        });
      }

      restaurants.push({
        id: restDoc._id,
        branchId: branch._id,
        restCatBySlug: new Map(),
      });
    }

    let insertedCount = 0;
    for (const item of MENU_ITEMS_50) {
      const globalCat = catBySlug.get(item.categorySlug);
      const targetRest = restaurants[item.restIdx];
      if (!globalCat || !targetRest) continue;

      let restCatId = targetRest.restCatBySlug.get(item.categorySlug);
      if (!restCatId) {
        const restCat = await RestaurantCategoryModel.findOneAndUpdate(
          { restaurantId: targetRest.id, name: globalCat.name },
          {
            $setOnInsert: {
              restaurantId: targetRest.id,
              name: globalCat.name,
              sortOrder: globalCat.sortOrder,
              isActive: true,
            },
          },
          { upsert: true, new: true }
        );
        restCatId = restCat._id;
        targetRest.restCatBySlug.set(item.categorySlug, restCatId);
      }

      const res = await FoodItemModel.updateOne(
        { restaurantId: targetRest.id, name: item.name },
        {
          $setOnInsert: {
            restaurantId: targetRest.id,
            branchId: targetRest.branchId,
            globalCategoryId: globalCat._id,
            restaurantCategoryId: restCatId,
            name: item.name,
            description: item.desc,
            ingredients: item.ingredients,
            regularPriceMinor: item.priceMinor,
            discountPriceMinor: item.discountMinor,
            currency: 'PKR',
            prepTimeMins: item.prep,
            isAvailable: true,
            isFeatured: insertedCount < 10,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) insertedCount++;

      const foodDoc = await FoodItemModel.findOne({ restaurantId: targetRest.id, name: item.name }).select('_id').lean();
      const foodImgUrl = CATEGORY_IMAGES[item.categorySlug] ?? CATEGORY_IMAGES.burgers;
      if (foodDoc) {
        const existingImg = await FoodImageModel.findOne({ foodItemId: foodDoc._id }).lean();
        if (!existingImg) {
          await FoodImageModel.create({
            foodItemId: foodDoc._id,
            url: foodImgUrl,
            isPrimary: true,
            sortOrder: 0,
          });
        }
      }
    }

    const totalFoods = await FoodItemModel.countDocuments();
    console.log(`Catalog seed complete: ${insertedCount} new items added (${totalFoods} total food items in MongoDB).`);
  } finally {
    await disconnectDatabase();
  }
}

seedSampleCatalog().catch((err) => {
  console.error('Catalog seed failed:', err);
  process.exit(1);
});
