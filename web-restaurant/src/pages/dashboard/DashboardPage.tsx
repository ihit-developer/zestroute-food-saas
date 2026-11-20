import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@zestroute/shared';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui';
import { useRestaurantDashboard } from '../../hooks/useRestaurantData';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useRestaurantDashboard();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} height={96} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load restaurant analytics." onRetry={() => refetch()} />;
  }

  const kpis = [
    { label: "Today's Orders", value: String(data.todayOrders) },
    { label: 'Total Orders', value: String(data.totalOrders) },
    { label: 'Pending Orders', value: String(data.pendingOrders) },
    { label: 'Accepted Orders', value: String(data.acceptedOrders) },
    { label: 'Completed Orders', value: String(data.completedOrders) },
    { label: 'Cancelled Orders', value: String(data.cancelledOrders) },
    { label: "Today's Sales", value: formatMoney(data.todaySalesMinor) },
    { label: 'Weekly Sales', value: formatMoney(data.weeklySalesMinor) },
    { label: 'Monthly Sales', value: formatMoney(data.monthlySalesMinor) },
    { label: 'Net Earnings', value: formatMoney(data.totalEarningsMinor) },
    { label: 'Platform Commission', value: formatMoney(data.platformCommissionMinor) },
    { label: 'Average Rating', value: data.averageRating > 0 ? data.averageRating.toFixed(1) : '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} className="zr-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{k.label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--zr-text)' }}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className="zr-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--zr-text-secondary)' }}>Best Selling Food Item</span>
        <strong style={{ fontSize: 16 }}>{data.bestSellingFood}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <div className="zr-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Daily Sales &amp; Orders</h3>
          {data.dailySalesSeries.length === 0 ? (
            <EmptyState
              title="No daily sales data yet"
              description="Live sales charts populate automatically from MongoDB orders in Phase 10."
            />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySalesSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--zr-border)" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#F47B20" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="zr-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Monthly Revenue Trend</h3>
          {data.monthlyRevenueSeries.length === 0 ? (
            <EmptyState
              title="No monthly revenue data yet"
              description="Monthly revenue and food performance trends appear once orders are completed."
            />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyRevenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--zr-border)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#D95F16" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
