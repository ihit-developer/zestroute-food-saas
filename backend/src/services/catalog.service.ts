import {
  CategoryModel,
  FoodImageModel,
  FoodItemAddonModel,
  FoodItemModel,
  FoodVariantModel,
  PromotionalBannerModel,
  RestaurantBranchModel,
  RestaurantCategoryModel,
  RestaurantModel,
  ReviewModel,
} from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { SubscriptionService } from './subscription.service.js';

export class CatalogService {
  static async getHomeFeed(selectedRestaurantId?: string) {
    const now = new Date();
    const [banners, categories, approvedRestaurants] = await Promise.all([
      PromotionalBannerModel.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
      })
        .sort({ sortOrder: 1 })
        .limit(8)
        .lean(),
      CategoryModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      RestaurantModel.find({ status: 'approved' })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean(),
    ]);

    // Enforce active Free Trial or Paid Subscription for customer-facing catalog
    const activeRestIdSet = await SubscriptionService.getActiveRestaurantIdSet(
      approvedRestaurants.map((r) => String(r._id))
    );
    const activeRestaurants = approvedRestaurants.filter((r) => activeRestIdSet.has(String(r._id)));

    // If a specific restaurant is chosen, load only its menu; otherwise load all active restaurants' dishes
    const targetRestaurantIds = selectedRestaurantId
      ? activeRestaurants
          .filter((r) => String(r._id) === selectedRestaurantId)
          .map((r) => r._id)
      : activeRestaurants.map((r) => r._id);

    const foods =
      targetRestaurantIds.length > 0
        ? await FoodItemModel.find({
            restaurantId: { $in: targetRestaurantIds },
            isAvailable: true,
          })
            .sort({ orderCount: -1, ratingAvg: -1, createdAt: -1 })
            .limit(100)
            .lean()
        : [];

    const restIds = activeRestaurants.map((r) => r._id);
    const branches = await RestaurantBranchModel.find({ restaurantId: { $in: restIds } }).lean();
    const branchByRestId = new Map(branches.map((b) => [String(b.restaurantId), b]));
    const restNameById = new Map(activeRestaurants.map((r) => [String(r._id), r.name]));

    const restaurantCards = activeRestaurants.map((r) => {
      const b = branchByRestId.get(String(r._id));
      return {
        id: String(r._id),
        name: r.name,
        cuisineLabel: r.cuisineTypes.join(' • ') || 'Multi-Cuisine',
        locationLabel: b ? `${b.area}, ${b.city}` : 'Lahore',
        logoUrl: r.logoUrl,
        coverUrl: r.coverUrl,
        rating: r.ratingAvg,
        ratingCount: r.ratingCount,
        deliveryTimeLabel: b ? `${b.prepTimeMins}-${b.prepTimeMins + 10} mins` : '25-35 mins',
        deliveryFeeMinor: b?.deliveryFeeMinor ?? 12000,
        minOrderMinor: b?.minOrderMinor ?? 30000,
        isOpen: b ? !b.isTemporarilyClosed && b.isActive : true,
      };
    });

    const foodIds = foods.map((f) => f._id);
    const images = await FoodImageModel.find({ foodItemId: { $in: foodIds }, isPrimary: true }).lean();
    const imgByFoodId = new Map(images.map((i) => [String(i.foodItemId), i.url]));

    const foodCards = foods.map((f) => ({
      id: String(f._id),
      restaurantId: String(f.restaurantId),
      restaurantName: restNameById.get(String(f.restaurantId)) ?? 'Dastarkhwan Kitchen',
      name: f.name,
      description: f.description,
      imageUrl: imgByFoodId.get(String(f._id)),
      regularPriceMinor: f.regularPriceMinor,
      discountPriceMinor: f.discountPriceMinor,
      rating: f.ratingAvg,
      prepTimeMins: f.prepTimeMins,
      isAvailable: f.isAvailable,
    }));

    return {
      banners: banners.map((b) => ({
        id: String(b._id),
        title: b.title,
        subtitle: b.description ?? '',
        imageUrl: b.imageUrl,
      })),
      categories: categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        imageUrl: c.imageUrl,
        isActive: c.isActive,
      })),
      popularRestaurants: restaurantCards,
      nearbyRestaurants: restaurantCards,
      bestSellingFoods: foodCards.slice(0, 8),
      recommendedFoods: foodCards.slice(0, 8),
      specialOffers: foodCards.filter((f) => f.discountPriceMinor !== undefined),
      trendingFoods: foodCards.slice(0, 8),
      recentlyOrdered: [],
      freeDeliveryRestaurants: [],
      featuredRestaurants: restaurantCards.slice(0, 5),
    };
  }

  static async listCategories() {
    return CategoryModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  }

  static async listRestaurants(params: {
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const filter: Record<string, unknown> = { status: 'approved' };

    if (params.search?.trim()) {
      filter.$text = { $search: params.search.trim() };
    }

    const sort: Record<string, 1 | -1> =
      params.sortBy === 'rating' ? { ratingAvg: -1 } : { ratingCount: -1, ratingAvg: -1 };

    const [rawItems] = await Promise.all([
      RestaurantModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const activeIdSet = await SubscriptionService.getActiveRestaurantIdSet(
      rawItems.map((r) => String(r._id))
    );
    const items = rawItems.filter((r) => activeIdSet.has(String(r._id)));
    const total = items.length;

    const branches = await RestaurantBranchModel.find({
      restaurantId: { $in: items.map((r) => r._id) },
    }).lean();
    const branchByRestId = new Map(branches.map((b) => [String(b.restaurantId), b]));

    return {
      items: items.map((r) => {
        const b = branchByRestId.get(String(r._id));
        return {
          id: String(r._id),
          name: r.name,
          cuisineLabel: r.cuisineTypes.join(' • ') || 'Multi-Cuisine',
          locationLabel: b ? `${b.area}, ${b.city}` : 'Lahore',
          logoUrl: r.logoUrl,
          coverUrl: r.coverUrl,
          rating: r.ratingAvg,
          ratingCount: r.ratingCount,
          deliveryTimeLabel: b ? `${b.prepTimeMins}-${b.prepTimeMins + 10} mins` : '25-35 mins',
          deliveryFeeMinor: b?.deliveryFeeMinor ?? 12000,
          minOrderMinor: b?.minOrderMinor ?? 30000,
          isOpen: b ? !b.isTemporarilyClosed && b.isActive : true,
        };
      }),
      meta: { page, limit, total },
    };
  }

  static async getRestaurantDetails(restaurantId: string) {
    const restaurant = await RestaurantModel.findOne({
      _id: restaurantId,
      status: 'approved',
    }).lean();

    if (!restaurant) {
      throw new AppError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found or unavailable');
    }

    const [branches, categories, foods, reviews] = await Promise.all([
      RestaurantBranchModel.find({ restaurantId, isActive: true }).lean(),
      RestaurantCategoryModel.find({ restaurantId, isActive: true }).sort({ sortOrder: 1 }).lean(),
      FoodItemModel.find({ restaurantId, isAvailable: true }).lean(),
      ReviewModel.find({ restaurantId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const foodImages = await FoodImageModel.find({
      foodItemId: { $in: foods.map((f) => f._id) },
      isPrimary: true,
    }).lean();
    const imgByFoodId = new Map(foodImages.map((i) => [String(i.foodItemId), i.url]));

    const subStatus = await SubscriptionService.evaluateRestaurantSubscription(restaurantId);

    return {
      restaurant,
      branches,
      categories,
      foods: foods.map((f) => ({ ...f, imageUrl: imgByFoodId.get(String(f._id)) })),
      reviews,
      subscriptionActive: subStatus.isAccessAllowed,
    };
  }

  static async getFoodDetails(foodId: string) {
    const food = await FoodItemModel.findById(foodId).lean();
    if (!food) {
      throw new AppError(404, 'FOOD_NOT_FOUND', 'Food item not found');
    }

    const [images, variants, addonLinks] = await Promise.all([
      FoodImageModel.find({ foodItemId: foodId }).sort({ sortOrder: 1 }).lean(),
      FoodVariantModel.find({ foodItemId: foodId, isAvailable: true }).lean(),
      FoodItemAddonModel.find({ foodItemId: foodId }).populate('addonId').lean(),
    ]);

    return { food, images, variants, addonLinks };
  }
}
