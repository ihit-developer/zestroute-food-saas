import { useQuery } from '@tanstack/react-query';
import { adminHttpClient, adminTokenStorage } from '../services/apiClient';

export interface AdminRecentOrder {
  id: string;
  orderNumber: string;
  restaurant: string;
  customer: string;
  totalMinor: number;
  status: string;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  totalCustomers: number;
  totalRestaurants: number;
  pendingRestaurantApps: number;
  totalRiders: number;
  pendingRiderApps: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  grossOrderValueMinor: number;
  platformRevenueMinor: number;
  totalCommissionsMinor: number;
  pendingPayoutsMinor: number;
  refundRequestsCount: number;
  revenueSeries: Array<{ label: string; revenue: number; orders: number }>;
  recentOrders: AdminRecentOrder[];
}

export interface AdminSettingsData {
  appName?: string;
  taxBps?: number;
  minOrderMinor?: number;
  defaultCommissionBps?: number;
  baseDeliveryFeeMinor?: number;
}

const emptyMetrics: AdminDashboardMetrics = {
  totalCustomers: 0,
  totalRestaurants: 0,
  pendingRestaurantApps: 0,
  totalRiders: 0,
  pendingRiderApps: 0,
  totalOrders: 0,
  todayOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  grossOrderValueMinor: 0,
  platformRevenueMinor: 0,
  totalCommissionsMinor: 0,
  pendingPayoutsMinor: 0,
  refundRequestsCount: 0,
  revenueSeries: [],
  recentOrders: [],
};

export function useAdminDashboard() {
  const hasToken = Boolean(adminTokenStorage.getAccessToken());
  const query = useQuery<AdminDashboardMetrics>({
    queryKey: ['admin', 'dashboard'],
    enabled: hasToken,
    refetchInterval: 5000,
    queryFn: () => adminHttpClient.get<AdminDashboardMetrics>('/admin/dashboard'),
  });
  return { ...query, data: query.data ?? emptyMetrics };
}

export function useAdminList<T>(key: string) {
  const hasToken = Boolean(adminTokenStorage.getAccessToken());
  const query = useQuery<T[]>({
    queryKey: ['admin', key],
    enabled: hasToken,
    refetchInterval: 5000,
    queryFn: () => adminHttpClient.get<T[]>(`/admin/${key}`),
  });
  return { ...query, data: query.data ?? [] };
}

export function useAdminSettings() {
  const hasToken = Boolean(adminTokenStorage.getAccessToken());
  return useQuery<AdminSettingsData>({
    queryKey: ['admin', 'settings'],
    enabled: hasToken,
    queryFn: () => adminHttpClient.get<AdminSettingsData>('/admin/settings'),
  });
}
