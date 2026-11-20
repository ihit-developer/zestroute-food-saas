import mongoose, { Schema } from 'mongoose';

// 13. categories (global admin categories)
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameUr: { type: String, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    imageUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'categories' }
);
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// 14. restaurant_categories
const restaurantCategorySchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'restaurant_categories' }
);
restaurantCategorySchema.index({ restaurantId: 1, isActive: 1, sortOrder: 1 });

// 15. food_items
const foodItemSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch' },
    globalCategoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    restaurantCategoryId: { type: Schema.Types.ObjectId, ref: 'RestaurantCategory' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ingredients: [{ type: String, trim: true }],
    regularPriceMinor: { type: Number, required: true, min: 0 },
    discountPriceMinor: { type: Number, min: 0 },
    currency: { type: String, default: 'PKR', required: true },
    prepTimeMins: { type: Number, default: 15, min: 1 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    orderCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true, collection: 'food_items' }
);
foodItemSchema.index({ name: 'text', description: 'text', ingredients: 'text' });
foodItemSchema.index({ restaurantId: 1, isAvailable: 1, restaurantCategoryId: 1 });
foodItemSchema.index({ globalCategoryId: 1, isAvailable: 1 });

// 16. food_images
const foodImageSchema = new Schema(
  {
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    url: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'food_images' }
);
foodImageSchema.index({ foodItemId: 1, sortOrder: 1 });

// 17. food_variants
const foodVariantSchema = new Schema(
  {
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    groupName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    priceDeltaMinor: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'food_variants' }
);
foodVariantSchema.index({ foodItemId: 1, isAvailable: 1 });

// 18. food_addons
const foodAddonSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    priceMinor: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'food_addons' }
);
foodAddonSchema.index({ restaurantId: 1, isAvailable: 1 });

// 19. food_item_addons
const foodItemAddonSchema = new Schema(
  {
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    addonGroupName: { type: String, required: true, trim: true },
    addonId: { type: Schema.Types.ObjectId, ref: 'FoodAddon', required: true },
    isRequired: { type: Boolean, default: false },
    minSelect: { type: Number, default: 0, min: 0 },
    maxSelect: { type: Number, default: 5, min: 1 },
  },
  { timestamps: true, collection: 'food_item_addons' }
);
foodItemAddonSchema.index({ foodItemId: 1, addonId: 1 }, { unique: true });

// 20. ingredients
const ingredientSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch' },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'Kitchen Essentials' },
    unit: { type: String, enum: ['g', 'kg', 'ml', 'l', 'pcs'], required: true },
    purchasePriceMinor: { type: Number, default: 0, min: 0 },
    supplierName: { type: String, trim: true },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    imageUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'ingredients' }
);
ingredientSchema.index({ restaurantId: 1, branchId: 1, name: 1 });

// 21. food_recipes
const foodRecipeSchema = new Schema(
  {
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'FoodVariant' },
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantityRequired: { type: Number, required: true, min: 0.001 },
  },
  { timestamps: true, collection: 'food_recipes' }
);
foodRecipeSchema.index({ foodItemId: 1, variantId: 1, ingredientId: 1 }, { unique: true });

// 22. food_stock
const foodStockSchema = new Schema(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'RestaurantBranch', required: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
    lastRestockedAt: { type: Date },
  },
  { timestamps: true, collection: 'food_stock' }
);
foodStockSchema.index({ ingredientId: 1, branchId: 1 }, { unique: true });

export const CategoryModel = mongoose.model('Category', categorySchema);
export const RestaurantCategoryModel = mongoose.model('RestaurantCategory', restaurantCategorySchema);
export const FoodItemModel = mongoose.model('FoodItem', foodItemSchema);
export const FoodImageModel = mongoose.model('FoodImage', foodImageSchema);
export const FoodVariantModel = mongoose.model('FoodVariant', foodVariantSchema);
export const FoodAddonModel = mongoose.model('FoodAddon', foodAddonSchema);
export const FoodItemAddonModel = mongoose.model('FoodItemAddon', foodItemAddonSchema);
export const IngredientModel = mongoose.model('Ingredient', ingredientSchema);
export const FoodRecipeModel = mongoose.model('FoodRecipe', foodRecipeSchema);
export const FoodStockModel = mongoose.model('FoodStock', foodStockSchema);
