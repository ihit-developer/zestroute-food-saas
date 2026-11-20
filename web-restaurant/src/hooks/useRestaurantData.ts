import { useQuery } from '@tanstack/react-query';
import type { OrderStatus } from '@zestroute/shared';
import { restaurantHttpClient } from '../services/apiClient';
import { useRestaurantStore } from '../store/useRestaurantStore';

export interface RestaurantDashboardMetrics {
  todayOrders: number;
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  todaySalesMinor: number;
  weeklySalesMinor: number;
  monthlySalesMinor: number;
  totalEarningsMinor: number;
  platformCommissionMinor: number;
  averageRating: number;
  bestSellingFood: string;
  dailySalesSeries: Array<{ day: string; sales: number; orders: number }>;
  monthlyRevenueSeries: Array<{ month: string; revenue: number }>;
}

export interface RestaurantOrderItem {
  name: string;
  variantName?: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface RestaurantOrderRow {
  id: string;
  orderNumber: string;
  restaurantName?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  items?: RestaurantOrderItem[];
  itemsSummary: string;
  subtotalMinor?: number;
  discountMinor?: number;
  deliveryFeeMinor?: number;
  taxMinor?: number;
  tipMinor?: number;
  totalMinor: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus: string;
  status: OrderStatus;
  createdAt: string;
}

const emptyMetrics: RestaurantDashboardMetrics = {
  todayOrders: 0,
  totalOrders: 0,
  pendingOrders: 0,
  acceptedOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  todaySalesMinor: 0,
  weeklySalesMinor: 0,
  monthlySalesMinor: 0,
  totalEarningsMinor: 0,
  platformCommissionMinor: 0,
  averageRating: 0,
  bestSellingFood: '—',
  dailySalesSeries: [],
  monthlyRevenueSeries: [],
};

export function useRestaurantDashboard() {
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const query = useQuery<RestaurantDashboardMetrics>({
    queryKey: ['restaurant', restaurantId, 'dashboard'],
    enabled: Boolean(restaurantId),
    refetchInterval: 4000,
    queryFn: () =>
      restaurantHttpClient.get<RestaurantDashboardMetrics>(`/restaurant/${restaurantId}/dashboard`),
  });
  return { ...query, data: query.data ?? emptyMetrics };
}

export function useRestaurantOrders(statusTab: string) {
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const query = useQuery<RestaurantOrderRow[]>({
    queryKey: ['restaurant', restaurantId, 'orders', statusTab],
    enabled: Boolean(restaurantId),
    refetchInterval: 4000,
    queryFn: () =>
      restaurantHttpClient.get<RestaurantOrderRow[]>(
        `/restaurant/${restaurantId}/orders?status=${statusTab}`
      ),
  });
  return { ...query, data: query.data ?? [] };
}

export function useRestaurantList<T>(key: string) {
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const query = useQuery<T[]>({
    queryKey: ['restaurant', restaurantId, key],
    enabled: Boolean(restaurantId),
    refetchInterval: 8000,
    queryFn: () => restaurantHttpClient.get<T[]>(`/restaurant/${restaurantId}/${key}`),
  });
  return { ...query, data: query.data ?? [] };
}
