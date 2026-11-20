import React, { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bike,
  ClipboardCheck,
  CreditCard,
  FolderTree,
  Globe,
  Image,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Moon,
  Percent,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sun,
  Ticket,
  Users,
} from 'lucide-react';
import { AdminSidebar, IconButton, SecondaryButton, useToast, type AdminNavItem } from '../components/ui/AdminUI';
import { useAdminStore } from '../store/useAdminStore';
import { adminAuthApi, adminTokenStorage } from '../services/apiClient';

export const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, locale, toggleTheme, toggleLocale } = useAdminStore();

  // Enforce Super Admin authentication before loading protected tabs
  if (!adminTokenStorage.getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  const navItems: AdminNavItem[] = [
    { key: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { key: '/customers', label: 'Customers', icon: <Users size={17} /> },
    { key: '/restaurants', label: 'Restaurants', icon: <Store size={17} /> },
    { key: '/restaurants/applications', label: 'Restaurant Apps', icon: <ClipboardCheck size={17} /> },
    { key: '/riders', label: 'Riders', icon: <Bike size={17} /> },
    { key: '/riders/applications', label: 'Rider Apps', icon: <ClipboardCheck size={17} /> },
    { key: '/orders', label: 'Global Orders', icon: <ShoppingBag size={17} /> },
    { key: '/categories', label: 'Categories', icon: <FolderTree size={17} /> },
    { key: '/coupons', label: 'Coupons', icon: <Ticket size={17} /> },
    { key: '/banners', label: 'Banners', icon: <Image size={17} /> },
    { key: '/commissions', label: 'Commissions', icon: <Percent size={17} /> },
    { key: '/payments', label: 'Payments', icon: <CreditCard size={17} /> },
    { key: '/refunds', label: 'Refunds & Disputes', icon: <RotateCcw size={17} /> },
    { key: '/complaints', label: 'Complaints', icon: <MessageSquareWarning size={17} /> },
    { key: '/analytics', label: 'Analytics & Reports', icon: <BarChart3 size={17} /> },
    { key: '/audit-logs', label: 'Audit Logs', icon: <Activity size={17} /> },
    { key: '/settings', label: 'Platform Settings', icon: <Settings size={17} /> },
  ];

  const activeItem =
    navItems
      .slice()
      .sort((a, b) => b.key.length - a.key.length)
      .find((i) => location.pathname.startsWith(i.key)) ?? navItems[0];

  const handleRefreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
    showToast('Synced live data from MongoDB');
  };

  return (
    <div className="zr-shell">
      <AdminSidebar
        items={navItems}
        activeKey={activeItem.key}
        onSelect={(k) => navigate(k)}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <div className="zr-main">
        <header className="zr-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F47B20 0%, #EA580C 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(244, 123, 32, 0.28)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {activeItem.label}
                </h1>
                <span className="zr-live-pill">
                  <span className="zr-live-dot" />
                  LIVE DATA
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                ZestRoute Super Admin · Multi-Restaurant SaaS Control Center
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton
              icon={<RefreshCw size={16} />}
              label="Refresh live data"
              onClick={() => void handleRefreshAll()}
            />
            <SecondaryButton onClick={toggleLocale} leftIcon={<Globe size={15} />}>
              {locale === 'en' ? 'اردو' : 'EN'}
            </SecondaryButton>
            <IconButton
              icon={theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              label="Toggle theme"
              onClick={toggleTheme}
            />
            <IconButton
              icon={<LogOut size={17} />}
              label="Admin Sign Out"
              onClick={async () => {
                const refresh = adminTokenStorage.getRefreshToken();
                if (typeof refresh === 'string') {
                  await adminAuthApi.logout(refresh).catch(() => {});
                }
                adminTokenStorage.clearTokens();
                queryClient.clear();
                navigate('/login');
              }}
            />
          </div>
        </header>

        <main style={{ padding: '24px 28px', maxWidth: 1420, width: '100%', margin: '0 auto', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
