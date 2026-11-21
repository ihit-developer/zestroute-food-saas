import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { formatMoney } from '@zestroute/shared';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../components/ui/AdminUI';
import { useAdminDashboard } from '../hooks/useAdminData';

const orderStatusTone = (status: string): 'success' | 'warning' | 'error' | 'info' | 'primary' => {
  if (status === 'delivered') return 'success';
  if (['cancelled', 'rejected', 'refunded'].includes(status)) return 'error';
  if (status === 'pending') return 'warning';
  return 'info';
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAdminDashboard();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <LoadingSkeleton height={130} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          <LoadingSkeleton height={110} />
          <LoadingSkeleton height={110} />
          <LoadingSkeleton height={110} />
          <LoadingSkeleton height={110} />
        </div>
        <LoadingSkeleton height={280} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Unable to load live platform metrics. Verify backend server is running and you are signed in as Super Admin."
        onRetry={() => void refetch()}
      />
    );
  }

  const kpis = [
    {
      label: 'Gross Order Value (GMV)',
      value: formatMoney(data.grossOrderValueMinor),
      sub: `${data.totalOrders} total orders`,
      icon: <DollarSign size={19} />,
      tint: 'rgba(244, 123, 32, 0.14)',
      color: '#EA580C',
    },
    {
      label: 'Platform Commissions',
      value: formatMoney(data.totalCommissionsMinor),
      sub: `Pending payouts: ${formatMoney(data.pendingPayoutsMinor)}`,
      icon: <TrendingUp size={19} />,
      tint: 'rgba(22, 163, 74, 0.14)',
      color: '#16A34A',
    },
    {
      label: 'Active Orders In Progress',
      value: String(data.pendingOrders),
      sub: `${data.todayOrders} placed today`,
      icon: <Clock size={19} />,
      tint: 'rgba(37, 99, 235, 0.14)',
      color: '#2563EB',
    },
    {
      label: 'Delivered Orders',
      value: String(data.completedOrders),
      sub: `${data.cancelledOrders} cancelled`,
      icon: <CheckCircle2 size={19} />,
      tint: 'rgba(16, 185, 129, 0.14)',
      color: '#059669',
    },
    {
      label: 'Registered Customers',
      value: String(data.totalCustomers),
      sub: 'Live customer accounts',
      icon: <Users size={19} />,
      tint: 'rgba(124, 58, 237, 0.14)',
      color: '#7C3AED',
    },
    {
      label: 'Approved Restaurants',
      value: String(data.totalRestaurants),
      sub: `${data.pendingRestaurantApps} pending apps`,
      icon: <Store size={19} />,
      tint: 'rgba(234, 88, 12, 0.14)',
      color: '#EA580C',
    },
    {
      label: 'Approved Riders',
      value: String(data.totalRiders),
      sub: `${data.pendingRiderApps} pending apps`,
      icon: <Bike size={19} />,
      tint: 'rgba(14, 165, 233, 0.14)',
      color: '#0284C7',
    },
    {
      label: 'Refund Queue',
      value: String(data.refundRequestsCount),
      sub: 'Awaiting admin review',
      icon: <RotateCcw size={19} />,
      tint: 'rgba(239, 68, 68, 0.14)',
      color: '#DC2626',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Executive Hero Banner */}
      <div className="zr-hero-admin">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              background: 'rgba(255,255,255,0.14)',
              padding: '5px 12px',
              borderRadius: 999,
            }}
          >
            <Sparkles size={13} /> DASTARKHWAN MULTI-RESTAURANT SAAS
          </span>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Live Platform Command Center
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.82)' }}>
            Monitoring <strong>{data.totalRestaurants}</strong> active kitchens,{' '}
            <strong>{data.totalCustomers}</strong> customers, and{' '}
            <strong>{data.totalOrders}</strong> real-time orders across your network.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PrimaryButton leftIcon={<ShoppingBag size={16} />} onClick={() => navigate('/orders')}>
            Global Orders
          </PrimaryButton>
          <SecondaryButton
            leftIcon={<ClipboardCheck size={16} />}
            onClick={() => navigate('/restaurants/applications')}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.25)' }}
          >
            Review Apps ({data.pendingRestaurantApps + data.pendingRiderApps})
          </SecondaryButton>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} className="zr-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--zr-text-secondary)' }}>
                {k.label}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: k.tint,
                  color: k.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {k.icon}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 600 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Dual Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div className="zr-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>7-Day Platform Revenue (PKR)</h3>
              <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                Real-time gross order value from MongoDB
              </span>
            </div>
            <Wallet size={18} color="#F47B20" />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--zr-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#F47B20" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="zr-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Daily Order Volume</h3>
              <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                Completed &amp; active orders over last 7 days
              </span>
            </div>
            <TrendingUp size={18} color="#16A34A" />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--zr-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  fill="rgba(22, 163, 74, 0.18)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Recent Orders Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Recent Platform Orders</h3>
            <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
              Latest live orders across all partner restaurants
            </span>
          </div>
          <SecondaryButton onClick={() => navigate('/orders')}>
            View All Orders <ArrowRight size={14} />
          </SecondaryButton>
        </div>

        <DataTable
          columns={[
            { key: 'num', header: 'Order #', render: (r) => <strong>{r.orderNumber}</strong> },
            { key: 'rest', header: 'Restaurant', render: (r) => <strong>{r.restaurant}</strong> },
            { key: 'cust', header: 'Customer', render: (r) => r.customer },
            { key: 'total', header: 'Amount', render: (r) => <strong>{formatMoney(r.totalMinor)}</strong> },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusBadge label={r.status.replace(/_/g, ' ')} tone={orderStatusTone(r.status)} />,
            },
            {
              key: 'date',
              header: 'Placed At',
              render: (r) => new Date(r.createdAt).toLocaleString(),
            },
          ]}
          data={data.recentOrders}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No orders placed yet"
              description="As soon as customers order from Pizza Box or Cheezious, orders appear here live."
            />
          }
        />
      </div>
    </div>
  );
};
