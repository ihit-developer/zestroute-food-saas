import type { SemanticTone } from '../constants/status';

export interface RestaurantCardData {
  id: string;
  name: string;
  cuisineLabel: string;
  locationLabel?: string;
  logoUrl?: string;
  coverUrl?: string;
  rating: number;
  ratingCount: number;
  deliveryTimeLabel: string;
  deliveryFeeMinor: number;
  minOrderMinor: number;
  isOpen: boolean;
  discountBadgeText?: string;
}

export interface FoodCardData {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  regularPriceMinor: number;
  discountPriceMinor?: number;
  rating?: number;
  prepTimeMins?: number;
  isAvailable: boolean;
  discountBadgeText?: string;
}

export interface CategoryCardData {
  id: string;
  name: string;
  imageUrl?: string;
  itemCount?: number;
  isActive?: boolean;
}

export interface BadgeConfig {
  label: string;
  tone: SemanticTone;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface TabItem {
  key: string;
  label: string;
  badgeCount?: number;
}
