import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isRTL } from '@zestroute/shared';
import { ToastProvider } from './components/ui';
import { useRestaurantStore } from './store/useRestaurantStore';
import { DashboardShell } from './layouts/DashboardShell';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { MenuCategoriesPage } from './pages/dashboard/MenuCategoriesPage';
import { MenuItemsPage } from './pages/dashboard/MenuItemsPage';
import { InventoryPage } from './pages/dashboard/InventoryPage';
import { PromotionsPage } from './pages/dashboard/PromotionsPage';
import { BranchesPage } from './pages/dashboard/BranchesPage';
import { StaffPage } from './pages/dashboard/StaffPage';
import { ReviewsPage } from './pages/dashboard/ReviewsPage';
import { FinancePage } from './pages/dashboard/FinancePage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { SupportPage } from './pages/dashboard/SupportPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { DesignSystemPreview } from './pages/DesignSystemPreview';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

export const App: React.FC = () => {
  const { theme, locale, toggleTheme, toggleLocale } = useRestaurantStore();

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route
              path="/design-system"
              element={
                <DesignSystemPreview
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  locale={locale}
                  onToggleLocale={toggleLocale}
                />
              }
            />

            <Route element={<DashboardShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/menu/categories" element={<MenuCategoriesPage />} />
              <Route path="/menu/items" element={<MenuItemsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
