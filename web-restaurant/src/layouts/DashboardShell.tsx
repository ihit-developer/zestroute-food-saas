import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApprovalStatus } from '@zestroute/shared';
import {
  Building2,
  ChefHat,
  Clock,
  CreditCard,
  DollarSign,
  FolderTree,
  Globe,
  Headphones,
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
import type { VendorSubscriptionOverview } from '../pages/dashboard/SubscriptionPage';
import { LiveOrderAlertPopup } from '../components/LiveOrderAlertPopup';

export const DashboardShell: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Portal',
  subtitle = 'Live orders, menu, inventory & financials',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState<Array<{ id: string; name: string; status: ApprovalStatus }>>([]);
  const { theme, locale, toggleTheme, toggleLocale, restaurantId, restaurantName, setRestaurantContext } =
    useRestaurantStore();

  const hasToken = Boolean(restaurantTokenStorage.getAccessToken());

  // Verify live session token — if missing/expired/invalid, force redirect to /login
  useEffect(() => {
    if (!hasToken) return;
    restaurantAuthApi
      .me()
      .catch(() => {
        restaurantTokenStorage.clearTokens();
        queryClient.clear();
        navigate('/login', { replace: true });
      });
  }, [hasToken, navigate, queryClient]);

  useEffect(() => {
    if (!hasToken) return;
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
  }, [hasToken, queryClient, restaurantId, restaurantName, setRestaurantContext]);

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
    { key: '/subscription', label: 'Subscription', icon: <CreditCard size={18} /> },
    { key: '/support', label: 'Live Support', icon: <Headphones size={18} /> },
    { key: '/profile', label: 'Profile', icon: <Store size={18} /> },
    { key: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const { data: subOverview } = useQuery<VendorSubscriptionOverview>({
    queryKey: ['restaurant', restaurantId, 'subscription'],
    enabled: Boolean(restaurantId && restaurantTokenStorage.getAccessToken()),
    refetchInterval: 10000,
    queryFn: () => restaurantHttpClient.get<VendorSubscriptionOverview>(`/restaurant/${restaurantId}/subscription`),
  });

  const sub = subOverview?.subscription;

  // Automatically redirect expired/suspended vendors to /subscription (preserving all restaurant data)
  useEffect(() => {
    if (!sub) return;
    const isExempt =
      location.pathname.startsWith('/subscription') ||
      location.pathname.startsWith('/support') ||
      location.pathname.startsWith('/profile');
    if (!sub.isAccessAllowed && !isExempt) {
      navigate('/subscription', { replace: true });
    }
  }, [sub, location.pathname, navigate]);

  const activeKey =
    navItems.find((i) => location.pathname.startsWith(i.key))?.key ?? '/dashboard';

  // Enforce Restaurant Partner login first whenever opening any portal link without a session
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="zr-shell">
      <Sidebar
        items={navItems}
        activeKey={activeKey}
        onSelect={(key) => navigate(key)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="zr-main">
        <LiveOrderAlertPopup />
        {/* Big Prominent Active Restaurant Brand Banner */}
        <div className="zr-kitchen-banner">
          <div className="zr-kitchen-left">
            <div className="zr-kitchen-icon">
              <Store size={19} color="#FFFFFF" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="zr-kitchen-kicker">Active Restaurant Web Portal</div>
              <div className="zr-kitchen-name">{restaurantName || 'Pizza Box'}</div>
            </div>
          </div>

          {myRestaurants.length > 1 ? (
            <div className="zr-kitchen-switcher">
              <span className="zr-kitchen-switch-label">Switch Kitchen:</span>
              <select
                aria-label="Switch Restaurant"
                className="zr-kitchen-select"
                value={restaurantId ?? myRestaurants[0].id}
                onChange={(e) => {
                  const picked = myRestaurants.find((r) => r.id === e.target.value);
                  if (picked) {
                    setRestaurantContext(picked.name, picked.status, picked.id);
                    void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
                  }
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
          title={title}
          subtitle={`${restaurantName || 'Pizza Box'}${subtitle ? ` · ${subtitle}` : ''}`}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
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
          {sub && (sub.status === 'trial' || !sub.isAccessAllowed || sub.remainingDays <= 7) ? (
            <div
              style={{
                marginBottom: 18,
                padding: '12px 18px',
                borderRadius: 12,
                background: !sub.isAccessAllowed
                  ? '#FEE2E2'
                  : sub.status === 'trial'
                    ? '#EFF6FF'
                    : '#FEF3C7',
                border: `1px solid ${
                  !sub.isAccessAllowed ? '#FCA5A5' : sub.status === 'trial' ? '#BFDBFE' : '#FCD34D'
                }`,
                color: !sub.isAccessAllowed ? '#991B1B' : sub.status === 'trial' ? '#1E40AF' : '#92400E',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} />
                {!sub.isAccessAllowed
                  ? sub.status === 'suspended'
                    ? 'Your subscription is suspended. Please contact Super Admin.'
                    : 'Your free trial or subscription has expired. Renew now to restore full access.'
                  : sub.status === 'trial'
                    ? `Your free trial expires in ${sub.remainingDays} ${sub.remainingDays === 1 ? 'day' : 'days'}.`
                    : `Your ${sub.packageName} plan expires in ${sub.remainingDays} ${sub.remainingDays === 1 ? 'day' : 'days'}.`}
              </span>
              {!location.pathname.startsWith('/subscription') ? (
                <button
                  type="button"
                  onClick={() => navigate('/subscription')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: !sub.isAccessAllowed ? '#DC2626' : '#F47B20',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  {!sub.isAccessAllowed ? 'Renew Subscription' : 'Upgrade Plan'}
                </button>
              ) : null}
            </div>
          ) : null}
          <Outlet />
        </main>

        <BottomNav items={navItems} activeKey={activeKey} onSelect={(key) => navigate(key)} />
      </div>
    </div>
  );
};
