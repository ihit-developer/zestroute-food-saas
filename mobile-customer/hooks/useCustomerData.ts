import { useQuery } from '@tanstack/react-query';
import type { CategoryCardData, FoodCardData, OrderStatus, RestaurantCardData } from '@zestroute/shared';
import type { SavedAddressDraft } from '../store/useAppStore';
import { httpClient } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';

export interface HomeFeedData {
  banners: Array<{ id: string; title: string; subtitle: string; imageUrl?: string }>;
  categories: CategoryCardData[];
  popularRestaurants: RestaurantCardData[];
  nearbyRestaurants: RestaurantCardData[];
  bestSellingFoods: FoodCardData[];
  recommendedFoods: FoodCardData[];
  specialOffers: FoodCardData[];
  trendingFoods: FoodCardData[];
  recentlyOrdered: FoodCardData[];
  freeDeliveryRestaurants: RestaurantCardData[];
  featuredRestaurants: RestaurantCardData[];
}

export interface OrderSummaryItem {
  id: string;
  orderNumber: string;
  restaurantId: string;
  restaurantName: string;
  itemsSummary: string;
  reorderItems?: Array<{ foodId: string; name: string; quantity: number; unitPriceMinor: number }>;
  totalMinor: number;
  paymentMethod: string;
  status: OrderStatus;
  deliveryOtp?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: { orderId?: string; status?: string };
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  updatedAt: string;
}

const emptyHomeFeed: HomeFeedData = {
  banners: [],
  categories: [],
  popularRestaurants: [],
  nearbyRestaurants: [],
  bestSellingFoods: [],
  recommendedFoods: [],
  specialOffers: [],
  trendingFoods: [],
  recentlyOrdered: [],
  freeDeliveryRestaurants: [],
  featuredRestaurants: [],
};

export function useHomeFeed(restaurantId?: string | null) {
  const qs = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
  const query = useQuery<HomeFeedData>({
    queryKey: ['customer', 'home', restaurantId ?? 'default'],
    refetchInterval: 10000,
    queryFn: () => httpClient.get<HomeFeedData>(`/catalog/home${qs}`, true),
  });
  return { ...query, data: query.data ?? emptyHomeFeed };
}

export function useRestaurantsDiscovery(filters?: {
  search?: string;
  category?: string | null;
  sortBy?: string;
  onlyOpen?: boolean;
  onlyDiscount?: boolean;
}) {
  const qs = new URLSearchParams();
  if (filters?.search) qs.set('search', filters.search);
  if (filters?.category) qs.set('category', filters.category);
  if (filters?.sortBy) qs.set('sortBy', filters.sortBy);
  const queryStr = qs.toString();

  const query = useQuery<RestaurantCardData[]>({
    queryKey: ['customer', 'restaurants', filters],
    queryFn: () =>
      httpClient.get<RestaurantCardData[]>(`/catalog/restaurants${queryStr ? `?${queryStr}` : ''}`, true),
  });
  return { ...query, data: query.data ?? [] };
}

export function useCustomerOrders(tab: 'active' | 'completed' | 'cancelled') {
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const query = useQuery<OrderSummaryItem[]>({
    queryKey: ['customer', 'orders', tab],
    enabled: isAuth,
    refetchInterval: 4000,
    queryFn: () => httpClient.get<OrderSummaryItem[]>(`/orders?tab=${tab}`),
  });
  return { ...query, data: query.data ?? [] };
}

export function useFavorites() {
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const query = useQuery<{ restaurants: RestaurantCardData[]; foods: FoodCardData[]; recent: FoodCardData[] }>({
    queryKey: ['customer', 'favorites'],
    enabled: isAuth,
    queryFn: () => httpClient.get('/favorites'),
  });
  return { ...query, data: query.data ?? { restaurants: [], foods: [], recent: [] } };
}

export function useSavedAddresses() {
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const query = useQuery<SavedAddressDraft[]>({
    queryKey: ['customer', 'addresses'],
    enabled: isAuth,
    queryFn: () => httpClient.get<SavedAddressDraft[]>('/addresses'),
  });
  return { ...query, data: query.data ?? [] };
}

export function useNotifications() {
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const query = useQuery<NotificationItem[]>({
    queryKey: ['customer', 'notifications'],
    enabled: isAuth,
    refetchInterval: 4000,
    queryFn: () => httpClient.get<NotificationItem[]>('/notifications'),
  });
  return { ...query, data: query.data ?? [] };
}

export function useSupportTickets() {
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const query = useQuery<SupportTicketItem[]>({
    queryKey: ['customer', 'support-tickets'],
    enabled: isAuth,
    queryFn: () => httpClient.get<SupportTicketItem[]>('/support/tickets'),
  });
  return { ...query, data: query.data ?? [] };
}
