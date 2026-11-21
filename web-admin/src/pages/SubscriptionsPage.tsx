import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  Crown,
  Edit3,
  Gift,
  Plus,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';
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
import { adminHttpClient } from '../services/apiClient';

interface PackageSubscriber {
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  accountType: string;
  status: string;
  remainingDays: number;
}

interface AdminPackage {
  id: string;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  platformAccess?: 'web_only' | 'mobile_only' | 'both';
  subscriberCount?: number;
  subscribers?: PackageSubscriber[];
  features: string[];
  isActive: boolean;
  trialEligible?: boolean;
  sortOrder: number;
}

const PLATFORM_LABELS: Record<'web_only' | 'mobile_only' | 'both', { label: string; tone: 'info' | 'warning' | 'success' }> = {
  both: { label: 'Website + Mobile App', tone: 'success' },
  web_only: { label: 'Website Only', tone: 'info' },
  mobile_only: { label: 'Mobile App Only', tone: 'warning' },
};

interface AdminVendorSub {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  packageId?: string | null;
  packageName: string;
  status: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
  isAccessAllowed?: boolean;
  remainingDays: number;
  billingCycle: string;
  expiresAt: string | null;
}

interface AdminPayment {
  id: string;
  restaurantId?: string;
  restaurantName: string;
  packageName: string;
  billingCycle: 'monthly' | 'yearly';
  amountMinor: number;
  paymentMethod: string;
  transactionRef: string;
  senderAccount?: string;
  proofUrl?: string;
  proofImageUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

interface AdminSubscriptionOverview {
  metrics: {
    activeVendors: number;
    trialVendors: number;
    expiredVendors: number;
    pendingPaymentsCount?: number;
    pendingPayments?: number;
    totalRevenueMinor?: number;
    monthlyRevenueMinor: number;
    yearlyRevenueMinor: number;
  };
  trialConfig: {
    defaultTrialDays: number;
    paymentInstructions: string;
  };
  packages?: AdminPackage[];
  vendorSubscriptions?: AdminVendorSub[];
  subscriptions?: AdminVendorSub[];
  payments?: AdminPayment[];
}

export const SubscriptionsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'vendors' | 'payments' | 'packages' | 'config'>('vendors');

  // Package Modal State
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdminPackage | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgMonthlyPkr, setPkgMonthlyPkr] = useState('4900');
  const [pkgYearlyPkr, setPkgYearlyPkr] = useState('49000');
  const [pkgPlatform, setPkgPlatform] = useState<'web_only' | 'mobile_only' | 'both'>('both');
  const [pkgFeatures, setPkgFeatures] = useState('');
  const [pkgOrder, setPkgOrder] = useState('1');

  // Manage Vendor Subscription (Full Direct Super Admin Control / Free Friend Renewal / End Now)
  const [manageTarget, setManageTarget] = useState<AdminVendorSub | null>(null);
  const [managePkgId, setManagePkgId] = useState('');
  const [manageStatus, setManageStatus] = useState<'active' | 'trial' | 'expired' | 'suspended'>('active');
  const [manageCycle, setManageCycle] = useState<'monthly' | 'yearly' | 'trial'>('monthly');
  const [manageDays, setManageDays] = useState('30');
  const [manageExactDate, setManageExactDate] = useState('');

  // Reject Payment Modal State
  const [rejectTarget, setRejectTarget] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Trial Config State
  const [trialDays, setTrialDays] = useState('7');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Easypaisa: 0329-5931738 | JazzCash: 0329-5931738 (Dastarkhwan Admin — Send payment and enter your Transaction ID below)'
  );

  const { data, isLoading, isError, refetch } = useQuery<AdminSubscriptionOverview>({
    queryKey: ['admin', 'subscriptions'],
    refetchInterval: 8000,
    queryFn: () => adminHttpClient.get<AdminSubscriptionOverview>('/admin/subscriptions/overview'),
  });

  useEffect(() => {
    if (data?.trialConfig) {
      setTrialDays(String(data.trialConfig.defaultTrialDays ?? 7));
      setPaymentInstructions(data.trialConfig.paymentInstructions ?? '');
    }
  }, [data?.trialConfig]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });

  const packages = data?.packages ?? [];
  const vendorSubs = data?.vendorSubscriptions ?? data?.subscriptions ?? [];
  const payments = data?.payments ?? [];

  const openCreatePkg = () => {
    setEditingPkg(null);
    setPkgName('');
    setPkgDesc('');
    setPkgMonthlyPkr('4900');
    setPkgYearlyPkr('49000');
    setPkgPlatform('both');
    setPkgFeatures('Full Menu & Order Management\nCustomer Mobile App Listing\nReal-time Analytics');
    setPkgOrder(String(packages.length + 1));
    setPkgModalOpen(true);
  };

  const openEditPkg = (pkg: AdminPackage) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description);
    setPkgMonthlyPkr(String(Math.round(pkg.monthlyPriceMinor / 100)));
    setPkgYearlyPkr(String(Math.round(pkg.yearlyPriceMinor / 100)));
    setPkgPlatform(pkg.platformAccess ?? 'both');
    setPkgFeatures((pkg.features ?? []).join('\n'));
    setPkgOrder(String(pkg.sortOrder));
    setPkgModalOpen(true);
  };

  const openManageVendor = (v: AdminVendorSub) => {
    setManageTarget(v);
    setManagePkgId(v.packageId ?? packages[0]?.id ?? '');
    setManageStatus(v.status === 'pending_payment' ? 'active' : v.status);
    setManageCycle(
      v.billingCycle === 'yearly' ? 'yearly' : v.billingCycle === 'trial' ? 'trial' : 'monthly'
    );
    setManageDays('30');
    setManageExactDate('');
  };

  const handleSaveVendorControl = async (override?: Record<string, unknown>, toastLabel?: string) => {
    if (!manageTarget) return;
    try {
      const payload = override ?? {
        packageId: managePkgId || undefined,
        status: manageStatus,
        billingCycle: manageCycle,
        ...(manageExactDate
          ? { expiresAt: new Date(manageExactDate).toISOString() }
          : manageDays && Number(manageDays) > 0
            ? { setDaysFromNow: Number(manageDays) }
            : {}),
      };
      await adminHttpClient.patch(`/admin/vendor-subscriptions/${manageTarget.restaurantId}`, payload);
      setManageTarget(null);
      await refresh();
      showToast(toastLabel ?? `Updated subscription for ${manageTarget.restaurantName}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update subscription');
    }
  };

  const handleSavePackage = async () => {
    if (!pkgName.trim()) {
      showToast('Package name is required');
      return;
    }
    const payload = {
      name: pkgName.trim(),
      description: pkgDesc.trim(),
      monthlyPriceMinor: Math.max(0, Math.round(Number(pkgMonthlyPkr) * 100)),
      yearlyPriceMinor: Math.max(0, Math.round(Number(pkgYearlyPkr) * 100)),
      platformAccess: pkgPlatform,
      features: pkgFeatures
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      sortOrder: Number(pkgOrder) || 0,
    };
    try {
      if (editingPkg) {
        await adminHttpClient.patch(`/admin/subscription-packages/${editingPkg.id}`, payload);
        showToast('Subscription package updated');
      } else {
        await adminHttpClient.post('/admin/subscription-packages', payload);
        showToast('Subscription package created');
      }
      setPkgModalOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to save package');
    }
  };

  const handleTogglePkg = async (pkg: AdminPackage) => {
    try {
      await adminHttpClient.patch(`/admin/subscription-packages/${pkg.id}`, { isActive: !pkg.isActive });
      await refresh();
      showToast(`Package ${pkg.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  };

  const handleDeletePkg = async (pkg: AdminPackage) => {
    try {
      await adminHttpClient.del(`/admin/subscription-packages/${pkg.id}`);
      await refresh();
      showToast('Package deleted');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  };

  const handleApprovePayment = async (payment: AdminPayment) => {
    try {
      await adminHttpClient.patch(`/admin/subscription-payments/${payment.id}/review`, {
        decision: 'approved',
      });
      await refresh();
      showToast(`Approved payment & activated ${payment.restaurantName}!`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Approval failed');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectTarget) return;
    try {
      await adminHttpClient.patch(`/admin/subscription-payments/${rejectTarget.id}/review`, {
        decision: 'rejected',
        reason: rejectReason.trim() || 'Payment reference could not be verified.',
      });
      setRejectTarget(null);
      setRejectReason('');
      await refresh();
      showToast('Payment rejected');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Rejection failed');
    }
  };

  const handleVendorQuickAction = async (
    vendor: AdminVendorSub,
    payload: Record<string, unknown>,
    label: string
  ) => {
    try {
      await adminHttpClient.patch(`/admin/vendor-subscriptions/${vendor.restaurantId}`, payload);
      await refresh();
      showToast(`${vendor.restaurantName}: ${label}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Action failed');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await adminHttpClient.patch('/admin/subscription-config', {
        defaultTrialDays: Math.max(1, Math.min(365, Number(trialDays) || 7)),
        paymentInstructions: paymentInstructions.trim(),
      });
      await refresh();
      showToast('Trial duration & payment instructions updated');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to save configuration');
    }
  };

  if (isLoading) {
    return <div className="zr-card" style={{ padding: 28 }}>Loading SaaS subscriptions overview...</div>;
  }

  if (isError || !data) {
    return (
      <div className="zr-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 800, color: '#DC2626' }}>Could not load SaaS Subscriptions data.</div>
        <div>
          <PrimaryButton onClick={() => void refetch()}>Retry</PrimaryButton>
        </div>
      </div>
    );
  }

  const m = data.metrics;
  const pendingCount = m.pendingPaymentsCount ?? m.pendingPayments ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14 }}>
        {[
          { label: 'Active Paid Vendors', value: String(m.activeVendors ?? 0), color: '#16A34A' },
          { label: 'Free Trial Vendors', value: String(m.trialVendors ?? 0), color: '#2563EB' },
          { label: 'Expired / Restricted', value: String(m.expiredVendors ?? 0), color: '#DC2626' },
          { label: 'Pending Payments', value: String(pendingCount), color: '#D97706' },
          { label: 'Monthly Sub Revenue', value: formatMoney(m.monthlyRevenueMinor ?? 0), color: '#F47B20' },
          { label: 'Yearly Sub Revenue', value: formatMoney(m.yearlyRevenueMinor ?? 0), color: '#7C3AED' },
        ].map((card) => (
          <div key={card.label} className="zr-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--zr-text-secondary)', textTransform: 'uppercase' }}>
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <Tabs
        items={[
          { key: 'vendors', label: `Vendor Subscriptions (${vendorSubs.length})` },
          { key: 'payments', label: `Payment Verification (${pendingCount})` },
          { key: 'packages', label: `Packages (${packages.length})` },
          { key: 'config', label: 'Trial & Payment Config' },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'vendors' | 'payments' | 'packages' | 'config')}
      />

      {/* TAB 1: VENDOR SUBSCRIPTIONS (FULL DIRECT SUPER ADMIN CONTROL) */}
      {tab === 'vendors' ? (
        <div className="zr-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              All Restaurant Vendor Subscriptions — Direct Super Admin Control
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
              Freely grant/renew subscriptions for friends & partners, change plans, extend days, suspend, or end any subscription immediately.
            </p>
          </div>
          {vendorSubs.length === 0 ? (
            <EmptyState
              title="No restaurants found"
              description="Registered restaurants will automatically start on a 7-day free trial."
            />
          ) : (
            <DataTable<AdminVendorSub>
              data={vendorSubs}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: 'restaurantName',
                  header: 'Restaurant & Owner',
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 800 }}>{r.restaurantName}</div>
                      <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                        {r.ownerName} · {r.ownerEmail}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'packageName',
                  header: 'Active Plan & Cycle',
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {r.status === 'trial'
                          ? r.packageName
                          : `${r.packageName} — ${r.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--zr-text-secondary)' }}>
                        {r.status === 'trial'
                          ? 'Free Trial Period'
                          : r.billingCycle === 'yearly'
                            ? 'Annual Subscription'
                            : 'Monthly Subscription'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <StatusBadge
                      label={r.status.replace('_', ' ').toUpperCase()}
                      tone={
                        r.status === 'active'
                          ? 'success'
                          : r.status === 'trial'
                            ? 'info'
                            : r.status === 'pending_payment'
                              ? 'warning'
                              : 'error'
                      }
                    />
                  ),
                },
                {
                  key: 'remainingDays',
                  header: 'Remaining / Expiry',
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.remainingDays} days left</div>
                      <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                        {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'controls',
                  header: 'Direct Admin Controls',
                  render: (r) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <PrimaryButton
                        leftIcon={<SlidersHorizontal size={13} />}
                        onClick={() => openManageVendor(r)}
                      >
                        Full Control
                      </PrimaryButton>
                      <SecondaryButton
                        leftIcon={<Gift size={13} />}
                        onClick={() =>
                          void handleVendorQuickAction(
                            r,
                            { grantFreeAccess: true, extendDays: 30 },
                            'Granted +30 days free access'
                          )
                        }
                      >
                        +30d Free
                      </SecondaryButton>
                      {r.status !== 'expired' ? (
                        <SecondaryButton
                          leftIcon={<Ban size={13} />}
                          onClick={() =>
                            void handleVendorQuickAction(r, { endImmediately: true }, 'Subscription ended immediately')
                          }
                        >
                          End Now
                        </SecondaryButton>
                      ) : null}
                      {r.status !== 'suspended' ? (
                        <SecondaryButton
                          leftIcon={<ShieldAlert size={13} />}
                          onClick={() =>
                            void handleVendorQuickAction(r, { status: 'suspended' }, 'Suspended')
                          }
                        >
                          Suspend
                        </SecondaryButton>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      ) : null}

      {/* TAB 2: PAYMENT VERIFICATION */}
      {tab === 'payments' ? (
        <div className="zr-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>Vendor Payment Submissions</h3>
          {payments.length === 0 ? (
            <EmptyState
              title="No subscription payments submitted yet"
              description="Payments sent to Easypaisa/JazzCash 0329-5931738 by restaurant vendors will appear here for verification."
            />
          ) : (
            <DataTable<AdminPayment>
              data={payments}
              rowKey={(r) => r.id}
              columns={[
                { key: 'restaurantName', header: 'Restaurant', render: (r) => <strong>{r.restaurantName}</strong> },
                {
                  key: 'packageName',
                  header: 'Plan',
                  render: (r) => (
                    <span>
                      <strong>{r.packageName}</strong> ({r.billingCycle})
                    </span>
                  ),
                },
                {
                  key: 'amountMinor',
                  header: 'Amount',
                  render: (r) => <strong>{formatMoney(r.amountMinor)}</strong>,
                },
                {
                  key: 'transactionRef',
                  header: 'Reference & Method',
                  render: (r) => {
                    const proof = r.proofUrl || r.proofImageUrl;
                    return (
                      <div>
                        <div style={{ fontWeight: 700 }}>{r.transactionRef}</div>
                        <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                          {r.paymentMethod.toUpperCase()} {r.senderAccount ? `· ${r.senderAccount}` : ''}
                        </div>
                        {proof ? (
                          <a href={proof} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--zr-primary)' }}>
                            View Receipt
                          </a>
                        ) : null}
                      </div>
                    );
                  },
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <StatusBadge
                      label={r.status.toUpperCase()}
                      tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) =>
                    r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <PrimaryButton
                          leftIcon={<CheckCircle2 size={14} />}
                          onClick={() => void handleApprovePayment(r)}
                        >
                          Approve
                        </PrimaryButton>
                        <SecondaryButton
                          leftIcon={<XCircle size={14} />}
                          onClick={() => setRejectTarget(r)}
                        >
                          Reject
                        </SecondaryButton>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                        {r.status === 'rejected' && r.rejectionReason ? r.rejectionReason : 'Reviewed'}
                      </span>
                    ),
                },
              ]}
            />
          )}
        </div>
      ) : null}

      {/* TAB 3: PACKAGES CRUD */}
      {tab === 'packages' ? (
        <div className="zr-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Dynamic Subscription Packages</h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
                Changes reflect immediately in all vendor subscription portals.
              </p>
            </div>
            <PrimaryButton leftIcon={<Plus size={15} />} onClick={openCreatePkg}>
              Create Package
            </PrimaryButton>
          </div>

          <DataTable<AdminPackage>
            data={packages}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'name',
                header: 'Package',
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: 800 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.description}</div>
                  </div>
                ),
              },
              {
                key: 'platformAccess',
                header: 'Platform Scope',
                render: (r) => {
                  const meta = PLATFORM_LABELS[r.platformAccess ?? 'both'];
                  return <StatusBadge label={meta.label} tone={meta.tone} />;
                },
              },
              {
                key: 'subscribers',
                header: 'Activated By (Restaurants)',
                render: (r) => {
                  const subs = r.subscribers ?? [];
                  if (subs.length === 0) {
                    return <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>No active restaurants</span>;
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {subs.map((s) => (
                        <div
                          key={s.restaurantId}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            fontSize: 12,
                            padding: '4px 8px',
                            borderRadius: 8,
                            background: 'var(--zr-surface-alt)',
                            border: '1px solid var(--zr-border)',
                          }}
                        >
                          <strong style={{ color: 'var(--zr-text-primary)' }}>{s.restaurantName}</strong>
                          <span style={{ color: 'var(--zr-text-secondary)' }}>({s.accountType} · {s.ownerName})</span>
                          <StatusBadge
                            label={`${s.status === 'trial' ? 'Trial' : 'Active'} · ${s.remainingDays}d`}
                            tone={s.status === 'trial' ? 'info' : 'success'}
                          />
                        </div>
                      ))}
                    </div>
                  );
                },
              },
              {
                key: 'monthlyPriceMinor',
                header: 'Monthly',
                render: (r) => <strong>{formatMoney(r.monthlyPriceMinor)}</strong>,
              },
              {
                key: 'yearlyPriceMinor',
                header: 'Yearly',
                render: (r) => <strong>{formatMoney(r.yearlyPriceMinor)}</strong>,
              },
              {
                key: 'features',
                header: 'Features',
                render: (r) => <span>{(r.features ?? []).length} included</span>,
              },
              {
                key: 'isActive',
                header: 'Status',
                render: (r) => (
                  <StatusBadge label={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'success' : 'error'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SecondaryButton leftIcon={<Edit3 size={13} />} onClick={() => openEditPkg(r)}>
                      Edit
                    </SecondaryButton>
                    <SecondaryButton onClick={() => void handleTogglePkg(r)}>
                      {r.isActive ? 'Disable' : 'Enable'}
                    </SecondaryButton>
                    <SecondaryButton leftIcon={<Trash2 size={13} />} onClick={() => void handleDeletePkg(r)}>
                      Delete
                    </SecondaryButton>
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {/* TAB 4: TRIAL & PAYMENT CONFIG */}
      {tab === 'config' ? (
        <div className="zr-card" style={{ padding: 24, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Free Trial & Payment Account Settings</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
              Default Free Trial is 7 days. Easypaisa & JazzCash number: <strong>0329-5931738</strong>.
            </p>
          </div>

          <InputField
            label="Default Free Trial Duration (Days — e.g. 7, 14, or 30)"
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Vendor Payment Instructions (Easypaisa / JazzCash / Bank)</label>
            <textarea
              rows={4}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--zr-border)',
                background: 'var(--zr-surface)',
                color: 'var(--zr-text-primary)',
                fontFamily: 'inherit',
                fontSize: 13.5,
              }}
            />
          </div>

          <div>
            <PrimaryButton leftIcon={<Save size={15} />} onClick={() => void handleSaveConfig()}>
              Save SaaS Configuration
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {/* FULL DIRECT SUPER ADMIN VENDOR SUBSCRIPTION CONTROL MODAL */}
      <Modal
        open={Boolean(manageTarget)}
        title={manageTarget ? `Manage Subscription — ${manageTarget.restaurantName}` : ''}
        onClose={() => setManageTarget(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setManageTarget(null)}>Cancel</SecondaryButton>
            <SecondaryButton
              leftIcon={<Ban size={14} />}
              onClick={() =>
                void handleSaveVendorControl({ endImmediately: true }, `Ended subscription for ${manageTarget?.restaurantName}`)
              }
            >
              End Immediately
            </SecondaryButton>
            <PrimaryButton leftIcon={<Crown size={14} />} onClick={() => void handleSaveVendorControl()}>
              Save Changes
            </PrimaryButton>
          </>
        }
      >
        {manageTarget ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick Free Friend / Partner Presets */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--zr-surface-alt)',
                border: '1px solid var(--zr-border)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: 'var(--zr-primary)' }}>
                1-CLICK FREE RENEWAL / FRIEND ACCESS (NO PAYMENT REQUIRED)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: '+7d Free', days: 7, cycle: 'trial' },
                  { label: '+30d (1 Mo Free)', days: 30, cycle: 'monthly' },
                  { label: '+90d (3 Mo Free)', days: 90, cycle: 'monthly' },
                  { label: '+365d (1 Yr Free)', days: 365, cycle: 'yearly' },
                  { label: 'Lifetime Free (10 Yrs)', days: 3650, cycle: 'yearly' },
                ].map((preset) => (
                  <SecondaryButton
                    key={preset.label}
                    leftIcon={<Gift size={12} />}
                    onClick={() =>
                      void handleSaveVendorControl(
                        {
                          packageId: managePkgId || undefined,
                          status: 'active',
                          billingCycle: preset.cycle,
                          grantFreeAccess: true,
                          setDaysFromNow: preset.days,
                        },
                        `Granted ${preset.label} to ${manageTarget.restaurantName}!`
                      )
                    }
                  >
                    {preset.label}
                  </SecondaryButton>
                ))}
              </div>
            </div>

            <Dropdown
              label="Assigned Subscription Package"
              value={managePkgId}
              onChange={setManagePkgId}
              options={packages.map((p) => ({ label: p.name, value: p.id }))}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Dropdown
                label="Subscription Status"
                value={manageStatus}
                onChange={(v) => setManageStatus(v as 'active' | 'trial' | 'expired' | 'suspended')}
                options={[
                  { label: 'Active (Full Access)', value: 'active' },
                  { label: 'Free Trial', value: 'trial' },
                  { label: 'Expired (Locked)', value: 'expired' },
                  { label: 'Suspended', value: 'suspended' },
                ]}
              />
              <Dropdown
                label="Billing Cycle"
                value={manageCycle}
                onChange={(v) => setManageCycle(v as 'monthly' | 'yearly' | 'trial')}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                  { label: 'Trial', value: 'trial' },
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InputField
                label="Set Active Days From Today"
                type="number"
                value={manageDays}
                onChange={(e) => {
                  setManageDays(e.target.value);
                  setManageExactDate('');
                }}
                placeholder="e.g. 30, 365"
              />
              <InputField
                label="OR Exact Expiry Date"
                type="date"
                value={manageExactDate}
                onChange={(e) => setManageExactDate(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Create/Edit Package Modal */}
      <Modal
        open={pkgModalOpen}
        title={editingPkg ? `Edit Package: ${editingPkg.name}` : 'Create Subscription Package'}
        onClose={() => setPkgModalOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setPkgModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSavePackage()}>Save Package</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Package Name *" value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Standard" />
          <InputField label="Description" value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="Short tagline" />
          <Dropdown
            label="Platform Scope (Website vs Mobile App)"
            value={pkgPlatform}
            onChange={(v) => setPkgPlatform(v as 'web_only' | 'mobile_only' | 'both')}
            options={[
              { label: 'Website + Mobile App (Full SaaS Suite)', value: 'both' },
              { label: 'Website Portal Only', value: 'web_only' },
              { label: 'Mobile App Only (Customer + Vendor App)', value: 'mobile_only' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Monthly Price (PKR)" type="number" value={pkgMonthlyPkr} onChange={(e) => setPkgMonthlyPkr(e.target.value)} />
            <InputField label="Yearly Price (PKR)" type="number" value={pkgYearlyPkr} onChange={(e) => setPkgYearlyPkr(e.target.value)} />
          </div>
          <InputField label="Display Order" type="number" value={pkgOrder} onChange={(e) => setPkgOrder(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Features (one per line)</label>
            <textarea
              rows={5}
              value={pkgFeatures}
              onChange={(e) => setPkgFeatures(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--zr-border)',
                background: 'var(--zr-surface)',
                color: 'var(--zr-text-primary)',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Reject Payment Modal */}
      <Modal
        open={Boolean(rejectTarget)}
        title="Reject Subscription Payment"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setRejectTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleRejectPayment()}>Confirm Rejection</PrimaryButton>
          </>
        }
      >
        <InputField
          label="Rejection Reason (shown to restaurant vendor)"
          placeholder="e.g. Transaction reference not found in JazzCash/Easypaisa statement"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};
