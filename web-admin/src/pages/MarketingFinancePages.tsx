import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  DataTable,
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui/AdminUI';
import { useAdminList, useAdminSettings } from '../hooks/useAdminData';
import { adminHttpClient } from '../services/apiClient';

interface SimpleRow { id: string; title: string; detail: string; status: string }

export const CouponsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('15');
  const [minOrderPkr, setMinOrderPkr] = useState('500');
  const [usageLimit, setUsageLimit] = useState('1000');
  const { data } = useAdminList<SimpleRow>('coupons');

  const handleCreateCoupon = async () => {
    if (!code.trim()) {
      showToast('Coupon code is required');
      return;
    }
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await adminHttpClient.post('/admin/coupons', {
        code: code.trim().toUpperCase(),
        scope: 'global',
        discountType: type,
        value: type === 'fixed' ? Number(value) * 100 : Number(value),
        minOrderMinor: Number(minOrderPkr) * 100,
        usageLimit: Number(usageLimit) || undefined,
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setOpen(false);
      setCode('');
      showToast('Coupon saved to MongoDB!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (r: SimpleRow) => {
    try {
      const next = r.status !== 'Active';
      await adminHttpClient.patch(`/admin/coupons/${r.id}`, { isActive: next });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      showToast(`${r.title} marked ${next ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (r: SimpleRow) => {
    try {
      await adminHttpClient.del(`/admin/coupons/${r.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      showToast(`${r.title} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete coupon');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Coupon Management</h2>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={() => setOpen(true)}>Create Coupon</PrimaryButton>
      </div>
      <DataTable
        columns={[
          { key: 'title', header: 'Code', render: (r) => <strong>{r.title}</strong> },
          { key: 'detail', header: 'Rules', render: (r) => r.detail },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} tone={r.status === 'Active' ? 'success' : 'neutral'} /> },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <SecondaryButton onClick={() => void handleToggleCoupon(r)}>
                  {r.status === 'Active' ? 'Disable' : 'Enable'}
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleDeleteCoupon(r)}>
                  <Trash2 size={13} />
                </SecondaryButton>
              </div>
            ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No coupons configured" description="Create percentage, fixed, first-order, or free-delivery coupons." actionLabel="New Coupon" onAction={() => setOpen(true)} />}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Platform Coupon"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleCreateCoupon()}>Save Coupon</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Coupon Code" placeholder="WELCOME20" value={code} onChange={(e) => setCode(e.target.value)} />
          <Dropdown
            label="Discount Type"
            value={type}
            onChange={setType}
            options={[
              { label: 'Percentage (%)', value: 'percent' },
              { label: 'Fixed Amount (PKR)', value: 'fixed' },
              { label: 'Free Delivery', value: 'free_delivery' },
            ]}
          />
          <InputField label="Discount Value (% or PKR)" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Minimum Order (PKR)" type="number" value={minOrderPkr} onChange={(e) => setMinOrderPkr(e.target.value)} />
            <InputField label="Usage Limit" type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const BannersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200');
  const [destinationId, setDestinationId] = useState('');
  const { data } = useAdminList<SimpleRow>('banners');

  const handleCreateBanner = async () => {
    if (!title.trim() || !imageUrl.trim()) {
      showToast('Banner title and image URL are required');
      return;
    }
    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await adminHttpClient.post('/admin/banners', {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        destinationType: destinationId.trim() ? 'url' : 'none',
        destinationId: destinationId.trim() || undefined,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        sortOrder: data.length + 1,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      setOpen(false);
      setTitle('');
      setDestinationId('');
      showToast('Banner saved to MongoDB!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to create banner');
    }
  };

  const handleToggleBanner = async (r: SimpleRow) => {
    try {
      const next = r.status !== 'Active';
      await adminHttpClient.patch(`/admin/banners/${r.id}`, { isActive: next });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      showToast(`${r.title} marked ${next ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update banner');
    }
  };

  const handleDeleteBanner = async (r: SimpleRow) => {
    try {
      await adminHttpClient.del(`/admin/banners/${r.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      showToast(`${r.title} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete banner');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Promotional Banners</h2>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={() => setOpen(true)}>Add Banner</PrimaryButton>
      </div>
      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
          { key: 'detail', header: 'Schedule', render: (r) => r.detail },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} tone={r.status === 'Active' ? 'success' : 'neutral'} /> },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <SecondaryButton onClick={() => void handleToggleBanner(r)}>
                  {r.status === 'Active' ? 'Disable' : 'Enable'}
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleDeleteBanner(r)}>
                  <Trash2 size={13} />
                </SecondaryButton>
              </div>
            ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No promotional banners" description="Configure home carousel banners with start/end dates and target destinations." actionLabel="Create Banner" onAction={() => setOpen(true)} />}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Promotional Banner"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleCreateBanner()}>Save Banner</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Banner Title" placeholder="Ramadan Iftar Specials" value={title} onChange={(e) => setTitle(e.target.value)} />
          <InputField label="Banner Image URL" placeholder="https://images.unsplash.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <InputField label="Destination Route / ID (optional)" placeholder="/restaurants/featured" value={destinationId} onChange={(e) => setDestinationId(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export const CommissionsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useAdminSettings();
  const [commissionPct, setCommissionPct] = useState('15');
  const [baseFeePkr, setBaseFeePkr] = useState('120');

  useEffect(() => {
    if (settings?.defaultCommissionBps !== undefined) {
      setCommissionPct(String(settings.defaultCommissionBps / 100));
    }
    if (settings?.baseDeliveryFeeMinor !== undefined) {
      setBaseFeePkr(String(settings.baseDeliveryFeeMinor / 100));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await adminHttpClient.patch('/admin/settings', {
        defaultCommissionBps: Math.round(Number(commissionPct) * 100),
        baseDeliveryFeeMinor: Math.round(Number(baseFeePkr) * 100),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      showToast('Commission & delivery fee rules saved to MongoDB!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save rules');
    }
  };

  return (
    <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Commission &amp; Delivery Fee Rules</h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--zr-text-secondary)' }}>
        Historical commission basis points are snapshotted per order at checkout for immutable accounting.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <InputField label="Default Platform Commission (%)" type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
        <InputField label="Base Delivery Fee (PKR)" type="number" value={baseFeePkr} onChange={(e) => setBaseFeePkr(e.target.value)} />
      </div>
      <div>
        <PrimaryButton onClick={() => void handleSave()}>Save Rules</PrimaryButton>
      </div>
    </div>
  );
};

interface RiderPayoutRow {
  id: string;
  riderName: string;
  riderPhone: string;
  payoutMethod: string;
  accountTitle: string;
  accountNumber: string;
  amountMinor: number;
  status: string;
  createdAt: string;
}

export const PaymentsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState('payouts');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: payments } = useAdminList<SimpleRow>('payments');
  const { data: riderPayouts } = useAdminList<RiderPayoutRow>('rider-payouts');

  const pendingPayouts = riderPayouts.filter((p) => p.status === 'pending').length;

  const handlePayoutDecision = async (row: RiderPayoutRow, status: 'paid' | 'failed') => {
    setBusyId(row.id);
    try {
      await adminHttpClient.patch(`/admin/rider-payouts/${row.id}`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'rider-payouts'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(
        status === 'paid'
          ? `Approved & marked ${formatMoney(row.amountMinor)} PAID to ${row.riderName}!`
          : `Declined payout for ${row.riderName} (returned to rider balance)`
      );
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update payout');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Payments &amp; Rider Payouts</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Approve rider withdrawal requests (JazzCash / Easypaisa / Bank) and monitor order payments
          </span>
        </div>
        <StatusBadge
          label={`${pendingPayouts} pending payouts`}
          tone={pendingPayouts > 0 ? 'warning' : 'success'}
        />
      </div>

      <Tabs
        items={[
          { key: 'payouts', label: `Rider Payout Requests (${riderPayouts.length})` },
          { key: 'transactions', label: `Order Payments (${payments.length})` },
        ]}
        activeKey={view}
        onChange={setView}
      />

      {view === 'payouts' ? (
        <DataTable
          columns={[
            {
              key: 'rider',
              header: 'Rider',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 800 }}>{r.riderName}</div>
                  <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.riderPhone || '—'}</div>
                </div>
              ),
            },
            {
              key: 'acct',
              header: 'Payout Account',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {r.payoutMethod} · {r.accountNumber}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.accountTitle}</div>
                </div>
              ),
            },
            {
              key: 'amt',
              header: 'Amount',
              render: (r) => <strong style={{ color: '#16A34A' }}>{formatMoney(r.amountMinor)}</strong>,
            },
            {
              key: 'date',
              header: 'Requested',
              render: (r) => new Date(r.createdAt).toLocaleString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusBadge
                  label={r.status.toUpperCase()}
                  tone={r.status === 'paid' ? 'success' : r.status === 'failed' ? 'error' : 'warning'}
                />
              ),
            },
            {
              key: 'act',
              header: 'Actions',
              render: (r) =>
                r.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PrimaryButton
                      disabled={busyId === r.id}
                      onClick={() => void handlePayoutDecision(r, 'paid')}
                    >
                      {busyId === r.id ? 'Saving...' : 'Approve & Pay'}
                    </PrimaryButton>
                    <SecondaryButton
                      disabled={busyId === r.id}
                      onClick={() => void handlePayoutDecision(r, 'failed')}
                    >
                      Reject
                    </SecondaryButton>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                    {r.status === 'paid' ? 'Transferred ✓' : 'Declined'}
                  </span>
                ),
            },
          ]}
          data={riderPayouts}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No rider payout requests yet"
              description="When riders request withdrawals from their wallet, they appear here for Super Admin approval."
            />
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: 'Order #', render: (r) => <strong>{r.title}</strong> },
            { key: 'detail', header: 'Method & Amount', render: (r) => r.detail },
            {
              key: 'status',
              header: 'Verified Status',
              render: (r) => (
                <StatusBadge
                  label={r.status}
                  tone={r.status === 'paid' || r.status === 'verified' ? 'success' : 'info'}
                />
              ),
            },
          ]}
          data={payments}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No payment transactions yet"
              description="COD, JazzCash, Easypaisa, and Card transactions verified server-side appear here."
            />
          }
        />
      )}
    </div>
  );
};

export const RefundsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useAdminList<SimpleRow>('refunds');

  const handleRefund = async (r: SimpleRow, status: 'approved' | 'rejected') => {
    try {
      await adminHttpClient.patch(`/admin/refunds/${r.id}`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`Refund ${status}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to process refund');
    }
  };

  const pendingCount = data.filter((r) => r.status === 'requested').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Refund &amp; Dispute Queue</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Review customer refund requests and credit ZestRoute wallets atomically
          </span>
        </div>
        <StatusBadge label={`${pendingCount} pending`} tone={pendingCount > 0 ? 'warning' : 'success'} />
      </div>
      <DataTable
        columns={[
          { key: 'title', header: 'Order #', render: (r) => <strong>{r.title}</strong> },
          { key: 'detail', header: 'Reason & Amount', render: (r) => r.detail },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge
                label={r.status}
                tone={r.status === 'processed' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}
              />
            ),
          },
          {
            key: 'act',
            header: 'Actions',
            render: (r) =>
              r.status === 'requested' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <PrimaryButton onClick={() => void handleRefund(r, 'approved')}>Approve</PrimaryButton>
                  <SecondaryButton onClick={() => void handleRefund(r, 'rejected')}>Reject</SecondaryButton>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>Completed</span>
              ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No refund disputes pending" description="Review evidence attachments, add admin notes, and approve or reject refunds here." />}
      />
    </div>
  );
};
