import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  DataTable,
  EmptyState,
  InputField,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui/AdminUI';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { adminHttpClient } from '../services/apiClient';
import { useAdminDashboard, useAdminList, useAdminSettings } from '../hooks/useAdminData';
import { useAdminStore } from '../store/useAdminStore';

interface LogRow { id: string; actor: string; action: string; resource: string; timestamp: string }

export const ComplaintsPage: React.FC = () => {
  const { data } = useAdminList<LogRow>('complaints');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Customer Complaints &amp; Support Escalations</h2>
      <DataTable
        columns={[
          { key: 'actor', header: 'Customer', render: (r) => <strong>{r.actor}</strong> },
          { key: 'action', header: 'Issue', render: (r) => r.action },
          { key: 'res', header: 'Target', render: (r) => r.resource },
          { key: 'time', header: 'Date', render: (r) => r.timestamp },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No open complaints" description="Missing food, wrong order, and late delivery escalations appear here." />}
      />
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState('monthly');
  const { data } = useAdminDashboard();

  const metrics = [
    { label: 'Total Customers', value: String(data.totalCustomers) },
    { label: 'Total Restaurants', value: String(data.totalRestaurants) },
    { label: 'Total Riders', value: String(data.totalRiders) },
    { label: 'Total Orders', value: String(data.totalOrders) },
    { label: 'Completed Orders', value: String(data.completedOrders) },
    { label: 'Cancelled Orders', value: String(data.cancelledOrders) },
    { label: 'Gross Order Value', value: formatMoney(data.grossOrderValueMinor) },
    { label: 'Platform Commissions', value: formatMoney(data.totalCommissionsMinor) },
  ];

  const handleExportCsv = () => {
    const csv = [['Metric', 'Value'], ...metrics.map((m) => [m.label, m.value])]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zestroute-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Analytics CSV report downloaded!');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank', 'width=760,height=640');
    if (!win) {
      window.print();
      return;
    }
    const rows = metrics.map((m) => `<tr><td>${m.label}</td><td><strong>${m.value}</strong></td></tr>`).join('');
    win.document.write(`<!doctype html><html><head><title>ZestRoute Platform Analytics (${period})</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}h2{color:#F47B20}table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #ddd;padding:10px;font-size:14px}</style>
      </head><body><h2>ZestRoute Platform Analytics (${period.toUpperCase()})</h2>
      <p>Generated ${new Date().toLocaleString()}</p>
      <table><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          items={[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'yearly', label: 'Yearly' },
          ]}
          activeKey={period}
          onChange={setPeriod}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton leftIcon={<Download size={16} />} onClick={handleExportCsv}>
            Export CSV / Excel
          </SecondaryButton>
          <PrimaryButton leftIcon={<Download size={16} />} onClick={handleExportPdf}>
            Export PDF
          </PrimaryButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {metrics.map((m) => (
          <div key={m.label} className="zr-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AuditLogsPage: React.FC = () => {
  const { data } = useAdminList<LogRow>('audit-logs');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Immutable Security Audit Logs</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
          Every sensitive admin modification, approval, suspension, and financial action is logged permanently.
        </p>
      </div>
      <DataTable
        columns={[
          { key: 'actor', header: 'Actor', render: (r) => <strong>{r.actor}</strong> },
          { key: 'action', header: 'Action', render: (r) => <StatusBadge label={r.action} tone="primary" /> },
          { key: 'res', header: 'Resource', render: (r) => r.resource },
          { key: 'time', header: 'Timestamp', render: (r) => r.timestamp },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No audit events recorded yet" description="Server-side audit middleware records events in Phase 7 & 12." />}
      />
    </div>
  );
};

export const PlatformSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { theme, locale, toggleTheme, toggleLocale } = useAdminStore();
  const { data: settings } = useAdminSettings();
  const [appName, setAppName] = useState('ZestRoute');
  const [taxPct, setTaxPct] = useState('0');
  const [minOrderPkr, setMinOrderPkr] = useState('300');
  const [commissionPct, setCommissionPct] = useState('15');

  useEffect(() => {
    if (!settings) return;
    if (settings.appName) setAppName(settings.appName);
    if (settings.taxBps !== undefined) setTaxPct(String(settings.taxBps / 100));
    if (settings.minOrderMinor !== undefined) setMinOrderPkr(String(settings.minOrderMinor / 100));
    if (settings.defaultCommissionBps !== undefined) {
      setCommissionPct(String(settings.defaultCommissionBps / 100));
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await adminHttpClient.patch('/admin/settings', {
        appName,
        taxBps: Math.round(Number(taxPct) * 100),
        minOrderMinor: Math.round(Number(minOrderPkr) * 100),
        defaultCommissionBps: Math.round(Number(commissionPct) * 100),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      showToast('Platform settings saved to MongoDB!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save settings');
    }
  };

  return (
    <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Platform Configuration &amp; Policies</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <InputField label="Application Name" value={appName} onChange={(e) => setAppName(e.target.value)} />
        <InputField label="Default Currency" defaultValue="PKR" disabled />
        <InputField label="Tax Rate (%)" type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
        <InputField label="Minimum Order (PKR)" type="number" value={minOrderPkr} onChange={(e) => setMinOrderPkr(e.target.value)} />
        <InputField label="Default Commission (%)" type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
        <InputField label="Support Email" defaultValue="support@zestroute.app" />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PrimaryButton onClick={handleSaveSettings}>
          Save Platform Settings
        </PrimaryButton>
        <SecondaryButton onClick={toggleTheme}>
          Theme: {theme === 'light' ? 'Light -> Dark' : 'Dark -> Light'}
        </SecondaryButton>
        <SecondaryButton onClick={toggleLocale}>
          Language: {locale === 'en' ? 'English -> اردو (RTL)' : 'اردو -> English'}
        </SecondaryButton>
      </div>
    </div>
  );
};
