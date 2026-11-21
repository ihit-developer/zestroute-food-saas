import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isRTL } from '@zestroute/shared';
import { ToastProvider } from './components/ui/AdminUI';
import { useAdminStore } from './store/useAdminStore';
import { AdminShell } from './layouts/AdminShell';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import {
  CustomersPage,
  RestaurantApplicationsPage,
  RestaurantsPage,
  RiderApplicationsPage,
  RidersPage,
} from './pages/DirectoryPages';
import { GlobalCategoriesPage, GlobalOrdersPage } from './pages/OperationsPages';
import {
  BannersPage,
  CommissionsPage,
  CouponsPage,
  PaymentsPage,
  RefundsPage,
} from './pages/MarketingFinancePages';
import {
  AnalyticsPage,
  AuditLogsPage,
  ComplaintsPage,
  PlatformSettingsPage,
} from './pages/GovernancePages';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

export const App: React.FC = () => {
  const { theme, locale } = useAdminStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL(locale) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AdminLoginPage />} />
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/restaurants" element={<RestaurantsPage />} />
              <Route path="/restaurants/applications" element={<RestaurantApplicationsPage />} />
              <Route path="/riders" element={<RidersPage />} />
              <Route path="/riders/applications" element={<RiderApplicationsPage />} />
              <Route path="/orders" element={<GlobalOrdersPage />} />
              <Route path="/categories" element={<GlobalCategoriesPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/banners" element={<BannersPage />} />
              <Route path="/commissions" element={<CommissionsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/refunds" element={<RefundsPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/settings" element={<PlatformSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
