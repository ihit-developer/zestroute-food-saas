import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Crown,
  Edit3,
  Gift,
  LogOut,
  Package,
  Plus,
  Settings,
  SlidersHorizontal,
  Store,
  Trash2,
  X,
  XCircle,
} from 'lucide-react-native';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  InputField,
  LoadingSkeleton,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { authApi, httpClient, tokenStorage } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

type AdminTab = 'vendors' | 'payments' | 'packages' | 'config';

interface AdminPackage {
  id: string;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  platformAccess?: 'web_only' | 'mobile_only' | 'both';
  subscriberCount?: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

interface AdminVendorSub {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  packageId?: string | null;
  packageName: string;
  status: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
  remainingDays: number;
  billingCycle: string;
  expiresAt: string | null;
}

interface AdminPayment {
  id: string;
  restaurantName: string;
  packageName: string;
  billingCycle: 'monthly' | 'yearly';
  amountMinor: number;
  paymentMethod: string;
  transactionRef: string;
  senderAccount?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

interface AdminOverview {
  metrics: {
    activeVendors: number;
    trialVendors: number;
    expiredVendors: number;
    pendingPaymentsCount?: number;
    pendingPayments?: number;
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

export default function SuperAdminMobileDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);

  const [tab, setTab] = useState<AdminTab>('vendors');
  const [search, setSearch] = useState('');

  // Full Direct Control Modal for Vendor
  const [manageVendor, setManageVendor] = useState<AdminVendorSub | null>(null);
  const [mPkgId, setMPkgId] = useState('');
  const [mStatus, setMStatus] = useState<'active' | 'trial' | 'expired' | 'suspended'>('active');
  const [mCycle, setMCycle] = useState<'monthly' | 'yearly' | 'trial'>('monthly');
  const [mDays, setMDays] = useState('30');

  // Reject Payment Modal
  const [rejectPay, setRejectPay] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Package Modal
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<AdminPackage | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgMonthly, setPkgMonthly] = useState('4900');
  const [pkgYearly, setPkgYearly] = useState('49000');
  const [pkgPlatform, setPkgPlatform] = useState<'web_only' | 'mobile_only' | 'both'>('both');
  const [pkgFeatures, setPkgFeatures] = useState('');

  // Config State
  const [trialDays, setTrialDays] = useState('7');
  const [payInstructions, setPayInstructions] = useState('');

  const { data, isLoading, refetch } = useQuery<AdminOverview>({
    queryKey: ['admin', 'mobile', 'subscriptions'],
    refetchInterval: 8000,
    queryFn: () => httpClient.get<AdminOverview>('/admin/subscriptions/overview'),
  });

  useEffect(() => {
    if (data?.trialConfig) {
      setTrialDays(String(data.trialConfig.defaultTrialDays ?? 7));
      setPayInstructions(data.trialConfig.paymentInstructions ?? '');
    }
  }, [data?.trialConfig]);

  const packages = data?.packages ?? [];
  const vendors = data?.vendorSubscriptions ?? data?.subscriptions ?? [];
  const payments = data?.payments ?? [];
  const filteredVendors = vendors.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.restaurantName.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.ownerEmail.toLowerCase().includes(q)
    );
  });

  const handleLogout = async () => {
    const refresh = await tokenStorage.getRefreshToken();
    if (refresh) await authApi.logout(refresh).catch(() => {});
    await tokenStorage.clearTokens();
    setSession(null);
    queryClient.clear();
    router.replace('/(auth)/welcome');
  };

  const openManage = (v: AdminVendorSub) => {
    setManageVendor(v);
    setMPkgId(v.packageId ?? packages[0]?.id ?? '');
    setMStatus(v.status === 'pending_payment' ? 'active' : v.status);
    setMCycle(v.billingCycle === 'yearly' ? 'yearly' : v.billingCycle === 'trial' ? 'trial' : 'monthly');
    setMDays('30');
  };

  const updateVendorSub = async (
    restaurantId: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    try {
      await httpClient.patch(`/admin/vendor-subscriptions/${restaurantId}`, payload);
      setManageVendor(null);
      await refetch();
      showToast(successMsg, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed', 'error');
    }
  };

  const handleApprovePay = async (p: AdminPayment) => {
    try {
      await httpClient.patch(`/admin/subscription-payments/${p.id}/review`, { decision: 'approved' });
      await refetch();
      showToast(`Approved & activated ${p.restaurantName}!`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Approval failed', 'error');
    }
  };

  const handleRejectPay = async () => {
    if (!rejectPay) return;
    try {
      await httpClient.patch(`/admin/subscription-payments/${rejectPay.id}/review`, {
        decision: 'rejected',
        reason: rejectReason.trim() || 'Transaction reference could not be verified.',
      });
      setRejectPay(null);
      setRejectReason('');
      await refetch();
      showToast('Payment rejected', 'info');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Rejection failed', 'error');
    }
  };

  const openPkgForm = (pkg?: AdminPackage) => {
    if (pkg) {
      setEditPkg(pkg);
      setPkgName(pkg.name);
      setPkgDesc(pkg.description);
      setPkgMonthly(String(Math.round(pkg.monthlyPriceMinor / 100)));
      setPkgYearly(String(Math.round(pkg.yearlyPriceMinor / 100)));
      setPkgPlatform(pkg.platformAccess ?? 'both');
      setPkgFeatures((pkg.features ?? []).join('\n'));
    } else {
      setEditPkg(null);
      setPkgName('');
      setPkgDesc('');
      setPkgMonthly('4900');
      setPkgYearly('49000');
      setPkgPlatform('both');
      setPkgFeatures('Live Order Management\nMenu & Pricing\nCustomer Mobile App');
    }
    setPkgModalOpen(true);
  };

  const handleSavePkg = async () => {
    if (!pkgName.trim()) {
      showToast('Package name is required', 'error');
      return;
    }
    const payload = {
      name: pkgName.trim(),
      description: pkgDesc.trim(),
      monthlyPriceMinor: Math.max(0, Math.round(Number(pkgMonthly) * 100)),
      yearlyPriceMinor: Math.max(0, Math.round(Number(pkgYearly) * 100)),
      platformAccess: pkgPlatform,
      features: pkgFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    };
    try {
      if (editPkg) {
        await httpClient.patch(`/admin/subscription-packages/${editPkg.id}`, payload);
        showToast('Package updated', 'success');
      } else {
        await httpClient.post('/admin/subscription-packages', payload);
        showToast('Package created', 'success');
      }
      setPkgModalOpen(false);
      await refetch();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Could not save package', 'error');
    }
  };

  const handleTogglePkg = async (pkg: AdminPackage) => {
    try {
      await httpClient.patch(`/admin/subscription-packages/${pkg.id}`, { isActive: !pkg.isActive });
      await refetch();
      showToast(`Package ${pkg.isActive ? 'disabled' : 'enabled'}`, 'info');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed', 'error');
    }
  };

  const handleDeletePkg = async (pkg: AdminPackage) => {
    try {
      await httpClient.del(`/admin/subscription-packages/${pkg.id}`);
      await refetch();
      showToast('Package deleted', 'info');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Delete failed', 'error');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await httpClient.patch('/admin/subscription-config', {
        defaultTrialDays: Math.max(1, Math.min(365, Number(trialDays) || 7)),
        paymentInstructions: payInstructions.trim(),
      });
      await refetch();
      showToast('Trial & payment settings saved!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Save failed', 'error');
    }
  };

  const m = data?.metrics;
  const pendingCount = m?.pendingPaymentsCount ?? m?.pendingPayments ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Executive Super Admin Header */}
      <View style={styles.headerBar}>
        <View style={styles.crownBadge}>
          <Crown size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>SUPER ADMIN SAAS CONTROL</Text>
          <Text style={styles.headerTitle}>Dastarkhwan HQ</Text>
        </View>
        <Pressable onPress={() => void handleLogout()} style={styles.logoutBtn} hitSlop={8}>
          <LogOut size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refetch()} />}
      >
        {isLoading || !data ? (
          <LoadingSkeleton height={180} />
        ) : (
          <>
            {/* Executive 6-KPI Strip */}
            <View style={styles.kpiGrid}>
              {[
                { label: 'Active Paid', value: String(m?.activeVendors ?? 0), color: '#16A34A' },
                { label: 'Free Trials', value: String(m?.trialVendors ?? 0), color: '#2563EB' },
                { label: 'Expired', value: String(m?.expiredVendors ?? 0), color: '#DC2626' },
                { label: 'Pending Pay', value: String(pendingCount), color: '#D97706' },
                { label: 'Monthly Rev', value: formatMoney(m?.monthlyRevenueMinor ?? 0), color: '#F47B20' },
                { label: 'Yearly Rev', value: formatMoney(m?.yearlyRevenueMinor ?? 0), color: '#7C3AED' },
              ].map((k) => (
                <View
                  key={k.label}
                  style={[
                    styles.kpiCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }}>
                    {k.label.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: k.color, marginTop: 3 }} numberOfLines={1}>
                    {k.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* TAB 1: VENDOR SUBSCRIPTIONS (DIRECT CONTROL) */}
            {tab === 'vendors' ? (
              <View style={{ gap: 12 }}>
                <SearchBar
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search restaurant or owner..."
                />
                {filteredVendors.length === 0 ? (
                  <EmptyState title="No vendors found" description="Registered restaurants will appear here." />
                ) : (
                  filteredVendors.map((v) => (
                    <View
                      key={v.id}
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                            {v.restaurantName}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            {v.ownerName} · {v.ownerEmail}
                          </Text>
                        </View>
                        <StatusBadge
                          label={v.status.replace('_', ' ').toUpperCase()}
                          tone={
                            v.status === 'active'
                              ? 'success'
                              : v.status === 'trial'
                                ? 'info'
                                : v.status === 'pending_payment'
                                  ? 'warning'
                                  : 'error'
                          }
                        />
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                          {v.packageName} ({v.billingCycle})
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
                          {v.remainingDays}d left {v.expiresAt ? `· ${new Date(v.expiresAt).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <Pressable
                          onPress={() => openManage(v)}
                          style={[styles.actionPill, { backgroundColor: colors.primary }]}
                        >
                          <SlidersHorizontal size={13} color="#FFFFFF" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Full Control</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            void updateVendorSub(
                              v.restaurantId,
                              { grantFreeAccess: true, extendDays: 30 },
                              `${v.restaurantName}: +30d free access granted!`
                            )
                          }
                          style={[styles.actionPill, { backgroundColor: 'rgba(22,163,74,0.14)' }]}
                        >
                          <Gift size={13} color="#16A34A" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A' }}>+30d Free</Text>
                        </Pressable>
                        {v.status !== 'expired' ? (
                          <Pressable
                            onPress={() =>
                              void updateVendorSub(
                                v.restaurantId,
                                { endImmediately: true },
                                `${v.restaurantName}: subscription ended`
                              )
                            }
                            style={[styles.actionPill, { backgroundColor: 'rgba(220,38,38,0.14)' }]}
                          >
                            <Ban size={13} color="#DC2626" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>End Now</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {/* TAB 2: PAYMENT VERIFICATION */}
            {tab === 'payments' ? (
              <View style={{ gap: 12 }}>
                {payments.length === 0 ? (
                  <EmptyState
                    title="No payment submissions yet"
                    description="Vendor Easypaisa/JazzCash submissions to 0329-5931738 appear here."
                  />
                ) : (
                  payments.map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>
                          {p.restaurantName}
                        </Text>
                        <StatusBadge
                          label={p.status.toUpperCase()}
                          tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'error' : 'warning'}
                        />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                        {formatMoney(p.amountMinor)} · {p.packageName} ({p.billingCycle})
                      </Text>
                      <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>
                        {p.paymentMethod.toUpperCase()} · TID: {p.transactionRef}
                        {p.senderAccount ? ` · ${p.senderAccount}` : ''}
                      </Text>
                      {p.status === 'pending' ? (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          <View style={{ flex: 1 }}>
                            <PrimaryButton
                              title="Approve & Activate"
                              fullWidth
                              onPress={() => void handleApprovePay(p)}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <SecondaryButton
                              title="Reject"
                              fullWidth
                              onPress={() => setRejectPay(p)}
                            />
                          </View>
                        </View>
                      ) : p.rejectionReason ? (
                        <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                          Rejected: {p.rejectionReason}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {/* TAB 3: PACKAGES CRUD */}
            {tab === 'packages' ? (
              <View style={{ gap: 12 }}>
                <PrimaryButton title="+ Create Subscription Package" fullWidth onPress={() => openPkgForm()} />
                {packages.map((pkg) => (
                  <View
                    key={pkg.id}
                    style={[
                      styles.card,
                      { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>{pkg.name}</Text>
                      <StatusBadge label={pkg.isActive ? 'ACTIVE' : 'DISABLED'} tone={pkg.isActive ? 'success' : 'error'} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge
                        label={
                          pkg.platformAccess === 'web_only'
                            ? 'WEBSITE ONLY'
                            : pkg.platformAccess === 'mobile_only'
                              ? 'MOBILE APP ONLY'
                              : 'WEBSITE + MOBILE APP'
                        }
                        tone={
                          pkg.platformAccess === 'web_only'
                            ? 'info'
                            : pkg.platformAccess === 'mobile_only'
                              ? 'warning'
                              : 'success'
                        }
                      />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                        {pkg.subscriberCount ?? 0} active {(pkg.subscriberCount ?? 0) === 1 ? 'restaurant' : 'restaurants'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>{pkg.description}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                      Monthly: {formatMoney(pkg.monthlyPriceMinor)} · Yearly: {formatMoney(pkg.yearlyPriceMinor)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => openPkgForm(pkg)}
                        style={[styles.actionPill, { backgroundColor: colors.primarySoft }]}
                      >
                        <Edit3 size={13} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleTogglePkg(pkg)}
                        style={[styles.actionPill, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                          {pkg.isActive ? 'Disable' : 'Enable'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleDeletePkg(pkg)}
                        style={[styles.actionPill, { backgroundColor: 'rgba(220,38,38,0.12)' }]}
                      >
                        <Trash2 size={13} color="#DC2626" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* TAB 4: TRIAL & PAYMENT CONFIG */}
            {tab === 'config' ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                ]}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                  Trial & Payment Account Config
                </Text>
                <InputField
                  label="Default Free Trial Duration (Days)"
                  keyboardType="numeric"
                  value={trialDays}
                  onChangeText={setTrialDays}
                />
                <InputField
                  label="Easypaisa / JazzCash / Bank Instructions"
                  multiline
                  numberOfLines={4}
                  value={payInstructions}
                  onChangeText={setPayInstructions}
                />
                <PrimaryButton title="Save SaaS Configuration" fullWidth onPress={() => void handleSaveConfig()} />
                <SecondaryButton title="Sign Out Admin" fullWidth onPress={() => void handleLogout()} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Bottom 4-Tab Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {(
          [
            { key: 'vendors', label: 'Vendors', Icon: Store },
            { key: 'payments', label: `Payments (${pendingCount})`, Icon: CreditCard },
            { key: 'packages', label: 'Packages', Icon: Package },
            { key: 'config', label: 'Config', Icon: Settings },
          ] as const
        ).map((item) => {
          const active = tab === item.key;
          const IconComp = item.Icon;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
              <IconComp size={20} color={active ? '#7C3AED' : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? '800' : '600',
                  color: active ? '#7C3AED' : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FULL DIRECT CONTROL MODAL (FREE FRIEND RENEWAL / END NOW / PLAN ASSIGNMENT) */}
      <Modal
        visible={Boolean(manageVendor)}
        animationType="slide"
        transparent
        onRequestClose={() => setManageVendor(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                Manage: {manageVendor?.restaurantName}
              </Text>
              <Pressable onPress={() => setManageVendor(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
              {manageVendor ? (
                <>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#7C3AED' }}>
                    1-TAP FREE FRIEND / PARTNER ACCESS (NO PAYMENT)
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { label: '+7d Free', days: 7, cycle: 'trial' },
                      { label: '+30d Free', days: 30, cycle: 'monthly' },
                      { label: '+90d Free', days: 90, cycle: 'monthly' },
                      { label: '+365d Free', days: 365, cycle: 'yearly' },
                      { label: 'Lifetime Free', days: 3650, cycle: 'yearly' },
                    ].map((preset) => (
                      <Pressable
                        key={preset.label}
                        onPress={() =>
                          void updateVendorSub(
                            manageVendor.restaurantId,
                            {
                              packageId: mPkgId || undefined,
                              status: 'active',
                              billingCycle: preset.cycle,
                              grantFreeAccess: true,
                              setDaysFromNow: preset.days,
                            },
                            `Granted ${preset.label} to ${manageVendor.restaurantName}!`
                          )
                        }
                        style={[styles.actionPill, { backgroundColor: 'rgba(124,58,237,0.14)' }]}
                      >
                        <Gift size={12} color="#7C3AED" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>{preset.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.textSecondary }}>PACKAGE</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {packages.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setMPkgId(p.id)}
                        style={[
                          styles.pillBtn,
                          {
                            backgroundColor: mPkgId === p.id ? colors.primary : colors.background,
                            borderColor: mPkgId === p.id ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: mPkgId === p.id ? '#FFF' : colors.textPrimary }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.textSecondary }}>STATUS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['active', 'trial', 'expired', 'suspended'] as const).map((st) => (
                      <Pressable
                        key={st}
                        onPress={() => setMStatus(st)}
                        style={[
                          styles.pillBtn,
                          {
                            backgroundColor: mStatus === st ? '#7C3AED' : colors.background,
                            borderColor: mStatus === st ? '#7C3AED' : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: mStatus === st ? '#FFF' : colors.textPrimary,
                            textTransform: 'capitalize',
                          }}
                        >
                          {st}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <InputField
                    label="Set Active Days From Today"
                    keyboardType="numeric"
                    value={mDays}
                    onChangeText={setMDays}
                  />

                  <PrimaryButton
                    title="Save Subscription Changes"
                    fullWidth
                    onPress={() =>
                      void updateVendorSub(
                        manageVendor.restaurantId,
                        {
                          packageId: mPkgId || undefined,
                          status: mStatus,
                          billingCycle: mCycle,
                          ...(Number(mDays) > 0 ? { setDaysFromNow: Number(mDays) } : {}),
                        },
                        `Updated ${manageVendor.restaurantName}`
                      )
                    }
                  />
                  <SecondaryButton
                    title="End Subscription Immediately"
                    fullWidth
                    onPress={() =>
                      void updateVendorSub(
                        manageVendor.restaurantId,
                        { endImmediately: true },
                        `Ended subscription for ${manageVendor.restaurantName}`
                      )
                    }
                  />
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Payment Modal */}
      <Modal visible={Boolean(rejectPay)} animationType="fade" transparent onRequestClose={() => setRejectPay(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>Reject Payment</Text>
              <Pressable onPress={() => setRejectPay(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <InputField
              label="Rejection Reason (shown to vendor)"
              placeholder="e.g. TID not found in Easypaisa/JazzCash statement"
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <PrimaryButton title="Confirm Rejection" fullWidth onPress={() => void handleRejectPay()} />
          </View>
        </View>
      </Modal>

      {/* Package Create / Edit Modal */}
      <Modal visible={pkgModalOpen} animationType="slide" transparent onRequestClose={() => setPkgModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                {editPkg ? `Edit ${editPkg.name}` : 'Create Package'}
              </Text>
              <Pressable onPress={() => setPkgModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
              <InputField label="Package Name *" value={pkgName} onChangeText={setPkgName} />
              <InputField label="Description" value={pkgDesc} onChangeText={setPkgDesc} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.textSecondary }}>
                PLATFORM SCOPE (WEBSITE / MOBILE APP)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    { key: 'both', label: 'Web + Mobile App' },
                    { key: 'web_only', label: 'Website Only' },
                    { key: 'mobile_only', label: 'Mobile App Only' },
                  ] as const
                ).map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPkgPlatform(opt.key)}
                    style={[
                      styles.pillBtn,
                      {
                        backgroundColor: pkgPlatform === opt.key ? '#7C3AED' : colors.background,
                        borderColor: pkgPlatform === opt.key ? '#7C3AED' : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: pkgPlatform === opt.key ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField label="Monthly (PKR)" keyboardType="numeric" value={pkgMonthly} onChangeText={setPkgMonthly} />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="Yearly (PKR)" keyboardType="numeric" value={pkgYearly} onChangeText={setPkgYearly} />
                </View>
              </View>
              <InputField
                label="Features (one per line)"
                multiline
                numberOfLines={4}
                value={pkgFeatures}
                onChangeText={setPkgFeatures}
              />
              <PrimaryButton title="Save Package" fullWidth onPress={() => void handleSavePkg()} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: { fontSize: 10, fontWeight: '800', color: '#C4B5FD', letterSpacing: 0.8 },
  headerTitle: { fontSize: 19, fontWeight: '900', color: '#FFFFFF' },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 14, paddingBottom: 24 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { width: '31.5%', padding: 11, borderWidth: 1 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '88%',
    gap: 10,
  },
});
