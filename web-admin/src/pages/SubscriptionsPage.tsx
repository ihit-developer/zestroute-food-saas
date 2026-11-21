import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Crown,
  Edit3,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  DataTable,
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

interface AdminPackage {
  id: string;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  features: string[];
  isActive: boolean;
  isTrialEligible: boolean;
  sortOrder: number;
}

interface AdminVendorSub {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  packageName: string;
  status: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
  isAccessAllowed: boolean;
  remainingDays: number;
  billingCycle: string;
  expiresAt: string | null;
}

interface AdminPayment {
  id: string;
  restaurantId: string;
  restaurantName: string;
  packageName: string;
  billingCycle: 'monthly' | 'yearly';
  amountMinor: number;
  paymentMethod: string;
  transactionRef: string;
  senderAccount?: string;
  proofUrl?: string;
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
    pendingPaymentsCount: number;
    totalRevenueMinor: number;
    monthlyRevenueMinor: number;
    yearlyRevenueMinor: number;
  };
  trialConfig: {
    defaultTrialDays: number;
    paymentInstructions: string;
  };
  packages: AdminPackage[];
  vendorSubscriptions: AdminVendorSub[];
  payments: AdminPayment[];
}

export const SubscriptionsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'payments' | 'vendors' | 'packages' | 'config'>('payments');

  // Package Modal State
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdminPackage | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgMonthlyPkr, setPkgMonthlyPkr] = useState('4999');
  const [pkgYearlyPkr, setPkgYearlyPkr] = useState('49990');
  const [pkgFeatures, setPkgFeatures] = useState('');
  const [pkgOrder, setPkgOrder] = useState('1');

  // Reject Payment Modal State
  const [rejectTarget, setRejectTarget] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Trial Config State
  const [trialDays, setTrialDays] = useState('14');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  const { data, isLoading } = useQuery<AdminSubscriptionOverview>({
    queryKey: ['admin', 'subscriptions'],
    refetchInterval: 8000,
    queryFn: () => adminHttpClient.get<AdminSubscriptionOverview>('/admin/subscriptions/overview'),
  });

  useEffect(() => {
    if (data?.trialConfig) {
      setTrialDays(String(data.trialConfig.defaultTrialDays));
      setPaymentInstructions(data.trialConfig.paymentInstructions);
    }
  }, [data?.trialConfig]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });

  const openCreatePkg = () => {
    setEditingPkg(null);
    setPkgName('');
    setPkgDesc('');
    setPkgMonthlyPkr('4999');
    setPkgYearlyPkr('49990');
    setPkgFeatures('Full Menu & Order Management\nCustomer Mobile App Listing\nReal-time Analytics');
    setPkgOrder(String((data?.packages.length ?? 0) + 1));
    setPkgModalOpen(true);
  };

  const openEditPkg = (pkg: AdminPackage) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description);
    setPkgMonthlyPkr(String(Math.round(pkg.monthlyPriceMinor / 100)));
    setPkgYearlyPkr(String(Math.round(pkg.yearlyPriceMinor / 100)));
    setPkgFeatures(pkg.features.join('\n'));
    setPkgOrder(String(pkg.sortOrder));
    setPkgModalOpen(true);
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

  const handleVendorAction = async (
    vendor: AdminVendorSub,
    payload: { status?: string; extendDays?: number },
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
        defaultTrialDays: Math.max(1, Math.min(90, Number(trialDays) || 14)),
        paymentInstructions: paymentInstructions.trim(),
      });
      await refresh();
      showToast('Trial duration & payment instructions updated');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to save configuration');
    }
  };

  if (isLoading || !data) {
    return <div className="zr-card" style={{ padding: 28 }}>Loading SaaS subscriptions overview...</div>;
  }

  const m = data.metrics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {[
          { label: 'Active Paid Vendors', value: String(m.activeVendors), color: '#16A34A' },
          { label: 'Free Trial Vendors', value: String(m.trialVendors), color: '#2563EB' },
          { label: 'Expired / Restricted', value: String(m.expiredVendors), color: '#DC2626' },
          { label: 'Pending Payments', value: String(m.pendingPaymentsCount), color: '#D97706' },
          { label: 'Monthly Sub Revenue', value: formatMoney(m.monthlyRevenueMinor), color: '#F47B20' },
          { label: 'Yearly Sub Revenue', value: formatMoney(m.yearlyRevenueMinor), color: '#7C3AED' },
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
          { key: 'payments', label: `Payment Verification (${m.pendingPaymentsCount})` },
          { key: 'vendors', label: `Vendor Subscriptions (${data.vendorSubscriptions.length})` },
          { key: 'packages', label: `Packages (${data.packages.length})` },
          { key: 'config', label: 'Trial & Payment Config' },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'payments' | 'vendors' | 'packages' | 'config')}
      />

      {/* TAB 1: PAYMENT VERIFICATION */}
      {tab === 'payments' ? (
        <div className="zr-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>Vendor Payment Submissions</h3>
          {data.payments.length === 0 ? (
            <EmptyState title="No subscription payments submitted yet" description="Payments submitted by restaurant vendors will appear here for verification." />
          ) : (
            <DataTable<AdminPayment>
              data={data.payments}
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
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.transactionRef}</div>
                      <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                        {r.paymentMethod.toUpperCase()} {r.senderAccount ? `· ${r.senderAccount}` : ''}
                      </div>
                      {r.proofUrl ? (
                        <a href={r.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--zr-primary)' }}>
                          View Receipt
                        </a>
                      ) : null}
                    </div>
                  ),
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

      {/* TAB 2: VENDOR SUBSCRIPTIONS */}
      {tab === 'vendors' ? (
        <div className="zr-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>All Restaurant Vendor Subscriptions</h3>
          {data.vendorSubscriptions.length === 0 ? (
            <EmptyState title="No restaurants found" description="Registered restaurants will automatically start on a free trial." />
          ) : (
            <DataTable<AdminVendorSub>
              data={data.vendorSubscriptions}
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
                { key: 'packageName', header: 'Plan', render: (r) => <span>{r.packageName}</span> },
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
                  header: 'Super Admin Controls',
                  render: (r) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <SecondaryButton
                        leftIcon={<Clock size={13} />}
                        onClick={() => void handleVendorAction(r, { extendDays: 30 }, 'Extended by +30 days')}
                      >
                        +30d
                      </SecondaryButton>
                      {r.status !== 'active' ? (
                        <PrimaryButton
                          leftIcon={<Crown size={13} />}
                          onClick={() => void handleVendorAction(r, { status: 'active', extendDays: 30 }, 'Activated')}
                        >
                          Activate
                        </PrimaryButton>
                      ) : null}
                      {r.status !== 'suspended' ? (
                        <SecondaryButton
                          leftIcon={<ShieldAlert size={13} />}
                          onClick={() => void handleVendorAction(r, { status: 'suspended' }, 'Suspended')}
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
            data={data.packages}
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
                render: (r) => <span>{r.features.length} included</span>,
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
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Free Trial & Payment Instructions</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
              Configure the automatic free trial length for new restaurant registrations and the payment account details shown to vendors.
            </p>
          </div>

          <InputField
            label="Default Free Trial Duration (Days — e.g. 7, 14, or 30)"
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Vendor Payment Instructions</label>
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
          placeholder="e.g. Transaction reference not found in JazzCash statement"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};
