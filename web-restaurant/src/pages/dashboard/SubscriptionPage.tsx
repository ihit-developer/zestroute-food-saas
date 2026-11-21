import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ShieldCheck,
  Sparkles,
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
  useToast,
} from '../../components/ui';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { restaurantHttpClient } from '../../services/apiClient';

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  features: string[];
  isTrialEligible: boolean;
  sortOrder: number;
}

interface PaymentRecord {
  id: string;
  packageName: string;
  billingCycle: 'monthly' | 'yearly';
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  transactionRef: string;
  senderAccount?: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface VendorSubscriptionOverview {
  subscription: {
    status: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
    isAccessAllowed: boolean;
    remainingDays: number;
    expiresAt: string | null;
    billingCycle: 'trial' | 'monthly' | 'yearly';
    packageId: string | null;
    packageName: string;
    trialStartDate?: string;
    trialEndDate?: string;
  };
  packages: SubscriptionPackage[];
  payments: PaymentRecord[];
  defaultTrialDays: number;
  paymentInstructions: string;
}

const STATUS_BADGE_MAP: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  trial: { label: 'Free Trial Active', tone: 'info' },
  active: { label: 'Active Subscription', tone: 'success' },
  pending_payment: { label: 'Payment Pending Verification', tone: 'warning' },
  expired: { label: 'Expired — Renewal Required', tone: 'error' },
  suspended: { label: 'Suspended by Admin', tone: 'error' },
};

export const SubscriptionPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPkg, setSelectedPkg] = useState<SubscriptionPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card'>('jazzcash');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery<VendorSubscriptionOverview>({
    queryKey: ['restaurant', restaurantId, 'subscription'],
    enabled: Boolean(restaurantId),
    refetchInterval: 8000,
    queryFn: () => restaurantHttpClient.get<VendorSubscriptionOverview>(`/restaurant/${restaurantId}/subscription`),
  });

  const sub = data?.subscription;
  const badgeInfo = STATUS_BADGE_MAP[sub?.status ?? 'trial'] ?? { label: sub?.status ?? 'Trial', tone: 'info' as const };

  const handleSubmitPayment = async () => {
    if (!restaurantId || !selectedPkg) return;
    if (!transactionRef.trim()) {
      showToast('Please enter your transaction reference ID');
      return;
    }
    setSubmitting(true);
    try {
      await restaurantHttpClient.post(`/restaurant/${restaurantId}/subscription/payments`, {
        packageId: selectedPkg.id,
        billingCycle,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        senderAccount: senderAccount.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'subscription'] });
      setSelectedPkg(null);
      setTransactionRef('');
      setSenderAccount('');
      setProofUrl('');
      setNotes('');
      showToast('Payment submitted! Waiting for Super Admin verification.');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !data || !sub) {
    return (
      <div className="zr-card" style={{ padding: 28, textAlign: 'center', color: 'var(--zr-text-secondary)' }}>
        Loading subscription status & plans...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Expiration / Suspension Alert Banner */}
      {!sub.isAccessAllowed ? (
        <div
          style={{
            padding: '18px 22px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
            border: '1px solid #FCA5A5',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            color: '#991B1B',
          }}
        >
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {sub.status === 'suspended'
                ? 'Your Restaurant Subscription Is Suspended'
                : sub.status === 'pending_payment'
                  ? 'Your Payment Is Under Super Admin Review'
                  : 'Your Free Trial / Subscription Has Expired'}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>
              {sub.status === 'suspended'
                ? 'Please contact the Dastarkhwan platform administrator to reactivate your restaurant access. All of your menus, orders, and restaurant data remain safely preserved.'
                : sub.status === 'pending_payment'
                  ? 'Thank you for submitting your payment. Your full restaurant management dashboard and customer storefront will unlock automatically as soon as the Super Admin approves your payment.'
                  : 'Your menus, orders, and settings are completely safe and preserved. Choose a Monthly or Yearly subscription package below to restore full access immediately upon verification.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Current Subscription Hero Card */}
      <div
        className="zr-card"
        style={{
          padding: 24,
          background: 'linear-gradient(135deg, var(--zr-surface) 0%, var(--zr-surface-alt) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusBadge label={badgeInfo.label} tone={badgeInfo.tone} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--zr-text-secondary)', textTransform: 'uppercase' }}>
              {sub.billingCycle === 'trial' ? 'Full-Access Trial' : `${sub.billingCycle} Billing`}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{sub.packageName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--zr-text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--zr-text-primary)' }}>
              <Clock size={15} />
              {sub.isAccessAllowed
                ? sub.status === 'trial'
                  ? `Your free trial expires in ${sub.remainingDays} ${sub.remainingDays === 1 ? 'day' : 'days'}`
                  : `Renews / expires in ${sub.remainingDays} ${sub.remainingDays === 1 ? 'day' : 'days'}`
                : '0 days remaining'}
            </span>
            {sub.expiresAt ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={15} />
                Expires: {new Date(sub.expiresAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 14,
              background: 'var(--zr-surface)',
              border: '1px solid var(--zr-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, color: sub.isAccessAllowed ? 'var(--zr-primary)' : '#DC2626' }}>
              {sub.remainingDays}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--zr-text-secondary)', textTransform: 'uppercase' }}>
              Days Left
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle + Packages Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Subscription Packages</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--zr-text-secondary)' }}>
            Upgrade or renew anytime. Early renewals preserve your remaining active days.
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: 'var(--zr-surface)',
            border: '1px solid var(--zr-border)',
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 16px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              background: billingCycle === 'monthly' ? 'var(--zr-primary)' : 'transparent',
              color: billingCycle === 'monthly' ? '#FFFFFF' : 'var(--zr-text-secondary)',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 16px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              background: billingCycle === 'yearly' ? 'var(--zr-primary)' : 'transparent',
              color: billingCycle === 'yearly' ? '#FFFFFF' : 'var(--zr-text-secondary)',
            }}
          >
            Yearly (Save 2 Months)
          </button>
        </div>
      </div>

      {/* Dynamic Packages Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
        {data.packages.map((pkg, idx) => {
          const priceMinor = billingCycle === 'yearly' ? pkg.yearlyPriceMinor : pkg.monthlyPriceMinor;
          const isCurrent = sub.packageId === pkg.id && sub.status === 'active';
          const isPopular = idx === 1;
          return (
            <div
              key={pkg.id}
              className="zr-card"
              style={{
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                border: isPopular ? '2px solid var(--zr-primary)' : '1px solid var(--zr-border)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>{pkg.name}</span>
                  {isCurrent ? (
                    <StatusBadge label="Current Plan" tone="success" />
                  ) : isPopular ? (
                    <StatusBadge label="Most Popular" tone="info" />
                  ) : null}
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--zr-text-secondary)', minHeight: 38 }}>
                  {pkg.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--zr-text-primary)' }}>
                    {formatMoney(priceMinor)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)', fontWeight: 600 }}>
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {pkg.features.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5 }}>
                      <Check size={16} color="var(--zr-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <PrimaryButton
                leftIcon={isCurrent ? <Sparkles size={15} /> : <CreditCard size={15} />}
                onClick={() => setSelectedPkg(pkg)}
              >
                {isCurrent ? `Renew ${pkg.name}` : `Subscribe to ${pkg.name}`}
              </PrimaryButton>
            </div>
          );
        })}
      </div>

      {/* Payment History Table */}
      <div className="zr-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Subscription Payment History</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
              Track all submitted payments and Super Admin verification status.
            </p>
          </div>
          <ShieldCheck size={20} color="var(--zr-primary)" />
        </div>

        {data.payments.length === 0 ? (
          <EmptyState
            title="No subscription payments yet"
            description="Select a package above when you are ready to subscribe or renew."
          />
        ) : (
          <DataTable<PaymentRecord>
            data={data.payments}
            rowKey={(r) => r.id}
            columns={[
              { key: 'packageName', header: 'Package', render: (r) => <strong>{r.packageName}</strong> },
              {
                key: 'billingCycle',
                header: 'Cycle',
                render: (r) => <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.billingCycle}</span>,
              },
              {
                key: 'amountMinor',
                header: 'Amount',
                render: (r) => <strong>{formatMoney(r.amountMinor)}</strong>,
              },
              {
                key: 'paymentMethod',
                header: 'Method',
                render: (r) => <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{r.paymentMethod.replace('_', ' ')}</span>,
              },
              { key: 'transactionRef', header: 'Transaction Ref', render: (r) => <span>{r.transactionRef}</span> },
              {
                key: 'createdAt',
                header: 'Submitted',
                render: (r) => <span>{new Date(r.createdAt).toLocaleDateString()}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <div>
                    <StatusBadge
                      label={r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                      tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}
                    />
                    {r.status === 'rejected' && r.rejectionReason ? (
                      <div style={{ fontSize: 11.5, color: '#DC2626', marginTop: 4 }}>{r.rejectionReason}</div>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Payment Submission Modal */}
      <Modal
        open={Boolean(selectedPkg)}
        title={selectedPkg ? `Pay for ${selectedPkg.name} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})` : ''}
        onClose={() => setSelectedPkg(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setSelectedPkg(null)}>Cancel</SecondaryButton>
            <PrimaryButton
              loading={submitting}
              leftIcon={<CheckCircle2 size={15} />}
              onClick={() => void handleSubmitPayment()}
            >
              Submit Payment for Verification
            </PrimaryButton>
          </>
        }
      >
        {selectedPkg ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'var(--zr-surface-alt)',
                border: '1px solid var(--zr-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--zr-text-secondary)' }}>Authoritative Amount Due</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--zr-primary)' }}>
                  {formatMoney(billingCycle === 'yearly' ? selectedPkg.yearlyPriceMinor : selectedPkg.monthlyPriceMinor)}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--zr-text-secondary)', lineHeight: 1.5 }}>
                {data.paymentInstructions}
              </div>
            </div>

            <Dropdown
              label="Payment Method"
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card')}
              options={[
                { label: 'JazzCash', value: 'jazzcash' },
                { label: 'Easypaisa', value: 'easypaisa' },
                { label: 'Bank Transfer (IBFT)', value: 'bank_transfer' },
                { label: 'Card / Online Transfer', value: 'card' },
              ]}
            />

            <InputField
              label="Transaction Reference ID *"
              placeholder="e.g. TXN-884920192"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />

            <InputField
              label="Sender Account / Mobile Number"
              placeholder="e.g. 0300-1234567"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
            />

            <InputField
              label="Payment Receipt / Proof URL (Optional)"
              placeholder="https://..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />

            <InputField
              label="Notes (Optional)"
              placeholder="Any details for the platform admin..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
