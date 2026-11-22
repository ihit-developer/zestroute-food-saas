import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Headphones, Send } from 'lucide-react';
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

interface AdminSupportTicket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  category: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messageCount: number;
  lastMessage: string;
  lastSenderRole: string;
  updatedAt: string;
}

interface AdminSupportDetail {
  ticket: AdminSupportTicket;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
}

export const ComplaintsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: tickets = [] } = useQuery<AdminSupportTicket[]>({
    queryKey: ['admin', 'support-tickets'],
    refetchInterval: 3000,
    queryFn: () => adminHttpClient.get<AdminSupportTicket[]>('/admin/support/tickets'),
  });

  const filtered = tickets.filter((t) => (filter === 'all' ? true : t.status === filter));
  const activeId = selectedId ?? filtered[0]?.id ?? null;

  const { data: detail, refetch: refetchDetail } = useQuery<AdminSupportDetail>({
    queryKey: ['admin', 'support-ticket', activeId],
    enabled: Boolean(activeId),
    refetchInterval: 3000,
    queryFn: () => adminHttpClient.get<AdminSupportDetail>(`/admin/support/tickets/${activeId}`),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length]);

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      await adminHttpClient.post(`/admin/support/tickets/${activeId}/messages`, { message: text });
      setReply('');
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!activeId) return;
    try {
      await adminHttpClient.patch(`/admin/support/tickets/${activeId}/status`, { status });
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
      showToast(`Ticket marked ${status.replace('_', ' ')}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={20} color="#F47B20" />
            Live Support Chat &amp; Customer Complaints
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Real-time two-way support inbox for Customers, Riders &amp; Restaurant Owners (auto-syncs every 3s).
          </p>
        </div>
        <Tabs
          items={[
            { key: 'all', label: `All (${tickets.length})` },
            { key: 'open', label: `Open (${tickets.filter((t) => t.status === 'open').length})` },
            { key: 'in_progress', label: `In Progress (${tickets.filter((t) => t.status === 'in_progress').length})` },
            { key: 'resolved', label: `Resolved (${tickets.filter((t) => t.status === 'resolved').length})` },
          ]}
          activeKey={filter}
          onChange={(k) => setFilter(k as 'all' | 'open' | 'in_progress' | 'resolved')}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="zr-card" style={{ padding: 28 }}>
          <EmptyState
            title="No support tickets in this view"
            description="When a customer, rider, or restaurant owner opens a support ticket, it will appear here in real time."
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left Ticket Inbox */}
          <div className="zr-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 620, overflowY: 'auto' }}>
            {filtered.map((t) => {
              const selected = t.id === activeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: selected ? '2px solid #F47B20' : '1px solid var(--zr-border)',
                    background: selected ? 'rgba(244,123,32,0.08)' : 'var(--zr-surface)',
                    color: 'var(--zr-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 13 }}>{t.ticketNumber}</strong>
                    <StatusBadge
                      label={t.status.replace('_', ' ').toUpperCase()}
                      tone={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}
                    />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                    {t.userName} {t.userEmail ? `· ${t.userEmail}` : ''}
                  </div>
                  {t.lastMessage ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--zr-text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.lastSenderRole === 'super_admin' ? 'You: ' : ''}{t.lastMessage}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right Live Chat Window */}
          <div className="zr-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 540 }}>
            {detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--zr-border)', paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#F47B20' }}>
                      {detail.ticket.ticketNumber} · {detail.ticket.category.replace('_', ' ').toUpperCase()}
                    </div>
                    <h3 style={{ margin: '2px 0', fontSize: 17, fontWeight: 900 }}>{detail.ticket.subject}</h3>
                    <div style={{ fontSize: 12.5, color: 'var(--zr-text-secondary)' }}>
                      {detail.ticket.userName} · {detail.ticket.userEmail} {detail.ticket.userPhone ? `· ${detail.ticket.userPhone}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                      <SecondaryButton
                        key={st}
                        onClick={() => void handleStatusChange(st)}
                      >
                        {st === detail.ticket.status ? `✓ ${st.replace('_', ' ')}` : st.replace('_', ' ')}
                      </SecondaryButton>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                  {detail.messages.map((m) => {
                    const isAdmin = m.senderRole === 'super_admin';
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--zr-text-secondary)', marginBottom: 3 }}>
                          {isAdmin ? 'Super Admin (You)' : `${m.senderName} (${m.senderRole.replace('_', ' ')})`}
                        </span>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: isAdmin ? '#F47B20' : 'var(--zr-surface-alt)',
                            color: isAdmin ? '#FFFFFF' : 'var(--zr-text-primary)',
                            border: isAdmin ? 'none' : '1px solid var(--zr-border)',
                            fontSize: 13.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {m.message}
                        </div>
                        <span style={{ fontSize: 10.5, color: 'var(--zr-text-secondary)', marginTop: 2 }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--zr-border)', paddingTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <InputField
                      placeholder="Type live reply to customer / restaurant..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendReply();
                        }
                      }}
                    />
                  </div>
                  <PrimaryButton
                    disabled={sending}
                    leftIcon={<Send size={15} />}
                    onClick={() => void handleSendReply()}
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </PrimaryButton>
                </div>
              </>
            ) : (
              <EmptyState title="Select a conversation" description="Pick any ticket on the left to start chatting live." />
            )}
          </div>
        </div>
      )}
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
    a.download = `dastarkhwan-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    win.document.write(`<!doctype html><html><head><title>Dastarkhwan Platform Analytics (${period})</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}h2{color:#F47B20}table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #ddd;padding:10px;font-size:14px}</style>
      </head><body><h2>Dastarkhwan Platform Analytics (${period.toUpperCase()})</h2>
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
  const [appName, setAppName] = useState('Dastarkhwan');
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
