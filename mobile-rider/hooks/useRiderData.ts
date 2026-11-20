import { useQuery } from '@tanstack/react-query';
import { riderHttpClient } from '../services/apiClient';
import { useRiderStore } from '../store/useRiderStore';

export interface RiderDashboardStats {
  todayDeliveries: number;
  completedDeliveries: number;
  todayEarningsMinor: number;
  weeklyEarningsMinor: number;
  monthlyEarningsMinor: number;
  ratingAvg: number;
}

export interface DeliveryRequestItem {
  assignmentId: string;
  deliveryId: string;
  restaurantName: string;
  pickupLocation: string;
  dropoffArea: string;
  distanceKm: number;
  estimatedEarningMinor: number;
  instructions?: string;
}

export interface RiderHistoryItem {
  deliveryId: string;
  orderNumber: string;
  restaurantName: string;
  area: string;
  earningMinor: number;
  tipMinor: number;
  status: 'delivered' | 'cancelled';
  completedAt: string;
}

export interface RiderEarningsSummary {
  totalMinor: number;
  deliveryFeesMinor: number;
  bonusesMinor: number;
  tipsMinor: number;
  payouts: Array<{ id: string; period: string; amountMinor: number; status: string }>;
}

const emptyStats: RiderDashboardStats = {
  todayDeliveries: 0,
  completedDeliveries: 0,
  todayEarningsMinor: 0,
  weeklyEarningsMinor: 0,
  monthlyEarningsMinor: 0,
  ratingAvg: 0,
};

export function useRiderDashboard() {
  const isAuth = useRiderStore((s) => s.isAuthenticated);
  const query = useQuery<RiderDashboardStats>({
    queryKey: ['rider', 'dashboard'],
    enabled: isAuth,
    queryFn: () => riderHttpClient.get<RiderDashboardStats>('/rider/dashboard'),
  });
  return { ...query, data: query.data ?? emptyStats };
}

export function useDeliveryRequests() {
  const isAuth = useRiderStore((s) => s.isAuthenticated);
  const query = useQuery<DeliveryRequestItem[]>({
    queryKey: ['rider', 'requests'],
    enabled: isAuth,
    queryFn: () => riderHttpClient.get<DeliveryRequestItem[]>('/rider/requests'),
  });
  return { ...query, data: query.data ?? [] };
}

export function useRiderEarnings(period: 'daily' | 'weekly' | 'monthly') {
  const isAuth = useRiderStore((s) => s.isAuthenticated);
  const query = useQuery<RiderEarningsSummary>({
    queryKey: ['rider', 'earnings', period],
    enabled: isAuth,
    queryFn: () => riderHttpClient.get<RiderEarningsSummary>(`/rider/earnings?period=${period}`),
  });
  return {
    ...query,
    data: query.data ?? {
      totalMinor: 0,
      deliveryFeesMinor: 0,
      bonusesMinor: 0,
      tipsMinor: 0,
      payouts: [],
    },
  };
}

export function useRiderHistory() {
  const isAuth = useRiderStore((s) => s.isAuthenticated);
  const query = useQuery<RiderHistoryItem[]>({
    queryKey: ['rider', 'history'],
    enabled: isAuth,
    queryFn: () => riderHttpClient.get<RiderHistoryItem[]>('/rider/history'),
  });
  return { ...query, data: query.data ?? [] };
}
