import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ApprovalStatus } from '@zestroute/shared';
import {
  Building2,
  ChefHat,
  DollarSign,
  FolderTree,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Sun,
  Tag,
  Users,
} from 'lucide-react';
import { BottomNav, IconButton, SecondaryButton, Sidebar, TopNav, type NavItem } from '../components/ui';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { restaurantAuthApi, restaurantHttpClient, restaurantTokenStorage } from '../services/apiClient';

export const DashboardShell: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Portal',
  subtitle = 'Live orders, menu, inventory & financials',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState<Array<{ id: string; name: string; status: ApprovalStatus }>>([]);
  const { theme, locale, toggleTheme, toggleLocale, restaurantId, restaurantName, setRestaurantContext } =
    useRestaurantStore();

  useEffect(() => {
    const token = restaurantTokenStorage.getAccessToken();
    if (!token) return;
    restaurantHttpClient
      .get<Array<{ id: string; name: string; status: ApprovalStatus }>>('/restaurant/mine')
      .then((mine) => {
        setMyRestaurants(mine);
        if (mine.length === 0) return;
        const currentMatch = mine.find((m) => m.id === restaurantId);
        if (!currentMatch) {
          const pizzaBox = mine.find((m) => m.name.toLowerCase().includes('pizza box')) ?? mine[0];
          setRestaurantContext(pizzaBox.name, pizzaBox.status, pizzaBox.id);
          void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
        } else if (currentMatch.name !== restaurantName) {
          setRestaurantContext(currentMatch.name, currentMatch.status, currentMatch.id);
        }
      })
      .catch(() => {});
  }, [queryClient, restaurantId, restaurantName, setRestaurantContext]);

  const navItems: NavItem[] = [
    { key: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { key: '/orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { key: '/menu/categories', label: 'Categories', icon: <FolderTree size={18} /> },
    { key: '/menu/items', label: 'Food Menu', icon: <ChefHat size={18} /> },
    { key: '/inventory', label: 'Inventory', icon: <Package size={18} /> },
    { key: '/promotions', label: 'Promotions', icon: <Tag size={18} /> },
    { key: '/branches', label: 'Branches', icon: <Building2 size={18} /> },
    { key: '/staff', label: 'Staff', icon: <Users size={18} /> },
    { key: '/reviews', label: 'Reviews', icon: <MessageSquare size={18} /> },
    { key: '/finance', label: 'Finance', icon: <DollarSign size={18} /> },
    { key: '/profile', label: 'Profile', icon: <Store size={18} /> },
    { key: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const activeKey =
    navItems.find((i) => location.pathname.startsWith(i.key))?.key ?? '/dashboard';

  return (
    <div className="zr-shell">
      <Sidebar
        items={navItems}
        activeKey={activeKey}
        onSelect={(key) => navigate(key)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="zr-main">
        {/* Big Prominent Active Restaurant Brand Banner */}
        <div
          style={{
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #F47B20, #D95F16)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9, textTransform: 'uppercase' }}>
                Active Restaurant Web Portal
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
                {restaurantName || 'Pizza Box'}
              </div>
            </div>
          </div>

          {myRestaurants.length > 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.92 }}>Switch Kitchen:</span>
              <select
                aria-label="Switch Restaurant"
                value={restaurantId ?? myRestaurants[0].id}
                onChange={(e) => {
                  const picked = myRestaurants.find((r) => r.id === e.target.value);
                  if (picked) {
                    setRestaurantContext(picked.name, picked.status, picked.id);
                    void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
                  }
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: '#FFFFFF',
                  color: '#1F1C19',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                {myRestaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <TopNav
          title={`${restaurantName || 'Pizza Box'} — ${title}`}
          subtitle={subtitle}
          actions={
            <>
              <SecondaryButton onClick={toggleLocale} leftIcon={<Globe size={16} />}>
                {locale === 'en' ? 'اردو' : 'EN'}
              </SecondaryButton>
              <IconButton
                icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                label="Toggle theme"
                onClick={toggleTheme}
              />
              <IconButton
                icon={<LogOut size={18} />}
                label="Sign Out"
                onClick={async () => {
                  const refresh = restaurantTokenStorage.getRefreshToken();
                  if (typeof refresh === 'string') {
                    await restaurantAuthApi.logout(refresh).catch(() => {});
                  }
                  restaurantTokenStorage.clearTokens();
                  navigate('/login');
                }}
              />
            </>
          }
        />

        <main style={{ padding: 24, maxWidth: 1320, width: '100%', margin: '0 auto', flex: 1 }}>
          <Outlet />
        </main>

        <BottomNav items={navItems} activeKey={activeKey} onSelect={(key) => navigate(key)} />
      </div>
    </div>
  );
};
