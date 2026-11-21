import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react-native';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  InputField,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { authApi, httpClient, tokenStorage } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

type VendorTab = 'overview' | 'orders' | 'menu' | 'plans' | 'kitchen';

interface MyRestaurant {
  id: string;
  name: string;
  status: string;
}

interface VendorMetrics {
  todayOrders: number;
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  completedOrders: number;
  todaySalesMinor: number;
  totalEarningsMinor: number;
  averageRating: number;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  itemsSummary: string;
  totalMinor: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface VendorFood {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  regularPriceMinor: number;
  discountPriceMinor: number;
  prepTimeMins: number;
  isAvailable: boolean;
}

interface VendorCategory {
  id: string;
  name: string;
}

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  features: string[];
}

interface PaymentRecord {
  id: string;
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

interface VendorSubOverview {
  subscription: {
    status: 'trial' | 'active' | 'pending_payment' | 'expired' | 'suspended';
    displayStatus?: string;
    isAccessAllowed: boolean;
    remainingDays: number;
    expiresAt: string | null;
    billingCycle: string;
    packageId: string | null;
    packageName: string;
  };
  packages: SubscriptionPackage[];
  payments: PaymentRecord[];
  paymentInstructions: string;
  defaultTrialDays: number;
}

export default function VendorDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);

  const [tab, setTab] = useState<VendorTab>('overview');
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'new' | 'preparing' | 'ready' | 'completed'>('new');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Payment Checkout Modal State
  const [payPkg, setPayPkg] = useState<SubscriptionPackage | null>(null);
  const [payMethod, setPayMethod] = useState<'easypaisa' | 'jazzcash' | 'bank_transfer' | 'card'>('easypaisa');
  const [txnRef, setTxnRef] = useState('');
  const [senderAcct, setSenderAcct] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Add Food Modal State
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodDesc, setFoodDesc] = useState('');
  const [foodPricePkr, setFoodPricePkr] = useState('');
  const [foodPrep, setFoodPrep] = useState('20');
  const [savingFood, setSavingFood] = useState(false);

  // 1. Load vendor's restaurants
  const {
    data: myRestaurants = [],
    isLoading: loadingRest,
    refetch: refetchRest,
  } = useQuery<MyRestaurant[]>({
    queryKey: ['vendor', 'mine'],
    queryFn: () => httpClient.get<MyRestaurant[]>('/restaurant/mine'),
  });

  useEffect(() => {
    if (myRestaurants.length > 0 && !selectedRestId) {
      setSelectedRestId(myRestaurants[0].id);
    }
  }, [myRestaurants, selectedRestId]);

  const activeRest = myRestaurants.find((r) => r.id === selectedRestId) ?? myRestaurants[0] ?? null;
  const restId = activeRest?.id ?? null;

  // 2. Live Subscription Status (always allowed even if expired)
  const {
    data: subData,
    isLoading: loadingSub,
    refetch: refetchSub,
  } = useQuery<VendorSubOverview>({
    queryKey: ['vendor', restId, 'subscription'],
    enabled: Boolean(restId),
    refetchInterval: 8000,
    queryFn: () => httpClient.get<VendorSubOverview>(`/restaurant/${restId}/subscription`),
  });

  const sub = subData?.subscription;
  const isLocked = Boolean(sub && !sub.isAccessAllowed);

  // Automatically redirect expired/suspended vendor to Plans tab
  useEffect(() => {
    if (isLocked && tab !== 'plans' && tab !== 'kitchen') {
      setTab('plans');
    }
  }, [isLocked, tab]);

  // 3. Operational queries (only run when subscription is active)
  const { data: metrics, refetch: refetchMetrics } = useQuery<VendorMetrics>({
    queryKey: ['vendor', restId, 'dashboard'],
    enabled: Boolean(restId && !isLocked),
    refetchInterval: 10000,
    queryFn: () => httpClient.get<VendorMetrics>(`/restaurant/${restId}/dashboard`),
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery<VendorOrder[]>({
    queryKey: ['vendor', restId, 'orders', orderFilter],
    enabled: Boolean(restId && !isLocked && tab === 'orders'),
    refetchInterval: 8000,
    queryFn: () => httpClient.get<VendorOrder[]>(`/restaurant/${restId}/orders?status=${orderFilter}`),
  });

  const { data: foods = [], refetch: refetchFoods } = useQuery<VendorFood[]>({
    queryKey: ['vendor', restId, 'foods'],
    enabled: Boolean(restId && !isLocked && tab === 'menu'),
    queryFn: () => httpClient.get<VendorFood[]>(`/restaurant/${restId}/foods`),
  });

  const { data: categories = [] } = useQuery<VendorCategory[]>({
    queryKey: ['vendor', restId, 'categories'],
    enabled: Boolean(restId && !isLocked && tab === 'menu'),
    queryFn: () => httpClient.get<VendorCategory[]>(`/restaurant/${restId}/categories`),
  });

  const handleRefreshAll = async () => {
    await Promise.all([refetchRest(), refetchSub(), refetchMetrics(), refetchOrders(), refetchFoods()]);
  };

  const handleLogout = async () => {
    const refresh = await tokenStorage.getRefreshToken();
    if (refresh) await authApi.logout(refresh).catch(() => {});
    await tokenStorage.clearTokens();
    setSession(null);
    queryClient.clear();
    router.replace('/(auth)/welcome');
  };

  const handleOrderTransition = async (
    orderId: string,
    nextStatus: 'confirmed' | 'preparing' | 'ready_for_pickup' | 'rejected'
  ) => {
    if (!restId) return;
    try {
      await httpClient.patch(`/restaurant/${restId}/orders/${orderId}/status`, { status: nextStatus });
      await Promise.all([refetchOrders(), refetchMetrics()]);
      showToast(`Order marked ${nextStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update order', 'error');
    }
  };

  const handleToggleFood = async (food: VendorFood) => {
    if (!restId) return;
    try {
      await httpClient.patch(`/restaurant/${restId}/foods/${food.id}`, { isAvailable: !food.isAvailable });
      await refetchFoods();
      showToast(`${food.name} ${food.isAvailable ? 'marked unavailable' : 'now available'}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed', 'error');
    }
  };

  const handleAddFood = async () => {
    if (!restId || !foodName.trim() || !foodPricePkr.trim()) {
      showToast('Enter dish name and price (PKR)', 'error');
      return;
    }
    setSavingFood(true);
    try {
      let categoryId = categories[0]?.id;
      if (!categoryId) {
        const createdCat = await httpClient.post<{ _id: string }>(`/restaurant/${restId}/categories`, {
          name: 'Menu Specials',
          sortOrder: 1,
        });
        categoryId = createdCat._id;
      }
      await httpClient.post(`/restaurant/${restId}/foods`, {
        restaurantCategoryId: categoryId,
        name: foodName.trim(),
        description: foodDesc.trim() || undefined,
        regularPriceMinor: Math.max(100, Math.round(Number(foodPricePkr) * 100)),
        prepTimeMins: Math.max(5, Number(foodPrep) || 20),
        isAvailable: true,
      });
      setAddFoodOpen(false);
      setFoodName('');
      setFoodDesc('');
      setFoodPricePkr('');
      await refetchFoods();
      showToast('Dish added to live menu!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Could not add dish', 'error');
    } finally {
      setSavingFood(false);
    }
  };

  const handleDeleteFood = async (food: VendorFood) => {
    if (!restId) return;
    try {
      await httpClient.del(`/restaurant/${restId}/foods/${food.id}`);
      await refetchFoods();
      showToast(`${food.name} deleted`, 'info');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Delete failed', 'error');
    }
  };

  const handleSubmitPayment = async () => {
    if (!restId || !payPkg) return;
    if (txnRef.trim().length < 4) {
      showToast('Please enter your Transaction Reference ID (TID)', 'error');
      return;
    }
    setSubmittingPay(true);
    try {
      await httpClient.post(`/restaurant/${restId}/subscription/payments`, {
        packageId: payPkg.id,
        billingCycle,
        paymentMethod: payMethod,
        senderAccount: senderAcct.trim() || 'Provided via TID',
        transactionRef: txnRef.trim(),
        proofImageUrl: proofUrl.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setPayPkg(null);
      setTxnRef('');
      setSenderAcct('');
      setProofUrl('');
      setPayNotes('');
      await refetchSub();
      showToast('Payment submitted! Waiting for Super Admin approval.', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Payment submission failed', 'error');
    } finally {
      setSubmittingPay(false);
    }
  };

  const statusTone =
    sub?.status === 'active'
      ? 'success'
      : sub?.status === 'trial'
        ? 'info'
        : sub?.status === 'pending_payment'
          ? 'warning'
          : 'error';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Executive Vendor Header */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>DASTARKHWAN VENDOR SAAS</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeRest?.name ?? 'My Restaurant'}
          </Text>
        </View>
        {sub ? (
          <Pressable
            onPress={() => setTab('plans')}
            style={[
              styles.daysChip,
              { backgroundColor: isLocked ? 'rgba(239,68,68,0.2)' : 'rgba(244,123,32,0.22)' },
            ]}
          >
            <Clock size={12} color={isLocked ? '#FCA5A5' : '#FDBA74'} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: isLocked ? '#FCA5A5' : '#FDBA74' }}>
              {isLocked ? 'EXPIRED' : `${sub.remainingDays}d left`}
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void handleLogout()} style={styles.logoutBtn} hitSlop={8}>
          <LogOut size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Live Trial / Expiration Countdown Banner */}
      {sub && (sub.status === 'trial' || isLocked || sub.remainingDays <= 7) ? (
        <Pressable
          onPress={() => setTab('plans')}
          style={[
            styles.countdownBanner,
            {
              backgroundColor: isLocked ? '#FEF2F2' : sub.status === 'trial' ? '#EFF6FF' : '#FEF3C7',
              borderBottomColor: isLocked ? '#FCA5A5' : sub.status === 'trial' ? '#BFDBFE' : '#FCD34D',
            },
          ]}
        >
          {isLocked ? (
            <AlertTriangle size={15} color="#DC2626" />
          ) : (
            <Clock size={15} color={sub.status === 'trial' ? '#1D4ED8' : '#B45309'} />
          )}
          <Text
            style={{
              flex: 1,
              fontSize: 12.5,
              fontWeight: '700',
              color: isLocked ? '#991B1B' : sub.status === 'trial' ? '#1E40AF' : '#92400E',
            }}
          >
            {isLocked
              ? sub.status === 'suspended'
                ? 'Subscription suspended by Admin. All data is safe.'
                : 'Your free trial / plan expired. Tap to renew — all restaurant data is safe.'
              : sub.status === 'trial'
                ? `Your free trial expires in ${sub.remainingDays} ${sub.remainingDays === 1 ? 'day' : 'days'}.`
                : `Your ${sub.packageName} plan expires in ${sub.remainingDays} days.`}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '900', color: isLocked ? '#DC2626' : colors.primary }}>
            {isLocked ? 'Renew →' : 'Plans →'}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void handleRefreshAll()} />}
      >
        {loadingRest || loadingSub ? (
          <LoadingSkeleton height={160} />
        ) : !activeRest ? (
          <EmptyState
            title="No Restaurant Found"
            description="Register your restaurant now to activate your 7-day free trial."
            actionLabel="Register Restaurant"
            onAction={() => router.push('/(auth)/register-restaurant')}
          />
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {tab === 'overview' ? (
              <View style={{ gap: 14 }}>
                <View style={styles.kpiGrid}>
                  {[
                    { label: "Today's Orders", value: String(metrics?.todayOrders ?? 0), color: '#2563EB' },
                    { label: 'Pending Kitchen', value: String(metrics?.pendingOrders ?? 0), color: '#D97706' },
                    { label: 'Total Earnings', value: formatMoney(metrics?.totalEarningsMinor ?? 0), color: '#16A34A' },
                    { label: 'Rating', value: `${(metrics?.averageRating ?? 0).toFixed(1)} ★`, color: '#F47B20' },
                  ].map((k) => (
                    <View
                      key={k.label}
                      style={[
                        styles.kpiCard,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                        {k.label.toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: k.color, marginTop: 4 }}>
                        {k.value}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                  ]}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                    Quick Restaurant Actions
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton title="Live Orders" fullWidth onPress={() => setTab('orders')} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton title="Edit Menu" fullWidth onPress={() => setTab('menu')} />
                    </View>
                  </View>
                  <SecondaryButton
                    title={`Manage Plan (${sub?.packageName ?? 'Trial'} · ${sub?.remainingDays ?? 0}d left)`}
                    fullWidth
                    onPress={() => setTab('plans')}
                  />
                </View>
              </View>
            ) : null}

            {/* TAB 2: ORDERS */}
            {tab === 'orders' ? (
              <View style={{ gap: 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(['new', 'preparing', 'ready', 'completed'] as const).map((f) => {
                    const active = orderFilter === f;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setOrderFilter(f)}
                        style={[
                          styles.pillBtn,
                          {
                            backgroundColor: active ? colors.primary : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: '800',
                            color: active ? '#FFFFFF' : colors.textPrimary,
                            textTransform: 'capitalize',
                          }}
                        >
                          {f}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {orders.length === 0 ? (
                  <EmptyState
                    title={`No ${orderFilter} orders`}
                    description="Incoming customer orders will appear here automatically."
                  />
                ) : (
                  orders.map((ord) => (
                    <View
                      key={ord.id}
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>
                          {ord.orderNumber}
                        </Text>
                        <StatusBadge label={ord.status.replace('_', ' ').toUpperCase()} tone="info" />
                      </View>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textPrimary }}>
                        {ord.customerName} {ord.customerPhone ? `· ${ord.customerPhone}` : ''}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>{ord.itemsSummary}</Text>
                      <View style={styles.rowBetween}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.primary }}>
                          {formatMoney(ord.totalMinor)}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: colors.textSecondary, textTransform: 'uppercase' }}>
                          {ord.paymentMethod}
                        </Text>
                      </View>

                      {ord.status === 'pending' ? (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <View style={{ flex: 1 }}>
                            <PrimaryButton
                              title="Accept"
                              fullWidth
                              onPress={() => void handleOrderTransition(ord.id, 'confirmed')}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <SecondaryButton
                              title="Reject"
                              fullWidth
                              onPress={() => void handleOrderTransition(ord.id, 'rejected')}
                            />
                          </View>
                        </View>
                      ) : ord.status === 'confirmed' ? (
                        <PrimaryButton
                          title="Start Preparing"
                          fullWidth
                          onPress={() => void handleOrderTransition(ord.id, 'preparing')}
                        />
                      ) : ord.status === 'preparing' ? (
                        <PrimaryButton
                          title="Mark Ready for Pickup"
                          fullWidth
                          onPress={() => void handleOrderTransition(ord.id, 'ready_for_pickup')}
                        />
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {/* TAB 3: MENU */}
            {tab === 'menu' ? (
              <View style={{ gap: 12 }}>
                <PrimaryButton
                  title="+ Add New Dish"
                  fullWidth
                  onPress={() => setAddFoodOpen(true)}
                />
                {foods.length === 0 ? (
                  <EmptyState
                    title="Your menu is empty"
                    description="Add your first dish so customers can order from your kitchen."
                  />
                ) : (
                  foods.map((f) => (
                    <View
                      key={f.id}
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                            {f.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            {f.categoryName} · {f.prepTimeMins} mins
                          </Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.primary }}>
                          {formatMoney(f.discountPriceMinor || f.regularPriceMinor)}
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Switch
                            value={f.isAvailable}
                            onValueChange={() => void handleToggleFood(f)}
                            trackColor={{ false: colors.border, true: '#16A34A' }}
                            thumbColor="#FFFFFF"
                          />
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textSecondary }}>
                            {f.isAvailable ? 'Available' : 'Sold Out'}
                          </Text>
                        </View>
                        <Pressable onPress={() => void handleDeleteFood(f)} hitSlop={8} style={{ padding: 4 }}>
                          <Trash2 size={17} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {/* TAB 4: SUBSCRIPTION PLANS & RENEWAL */}
            {tab === 'plans' && subData && sub ? (
              <View style={{ gap: 16 }}>
                {/* Hero Subscription Card */}
                <View style={[styles.subHero, { borderRadius: radii.xl }]}>
                  <View style={styles.rowBetween}>
                    <StatusBadge
                      label={
                        sub.status === 'trial'
                          ? 'FREE TRIAL ACTIVE'
                          : sub.status === 'active'
                            ? 'ACTIVE PLAN'
                            : sub.status === 'pending_payment'
                              ? 'PAYMENT PENDING'
                              : sub.status.toUpperCase()
                      }
                      tone={statusTone}
                    />
                    <Text style={{ fontSize: 22, fontWeight: '900', color: isLocked ? '#FCA5A5' : '#FDBA74' }}>
                      {sub.remainingDays}d left
                    </Text>
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}>
                    {sub.packageName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CalendarClock size={14} color="#94A3B8" />
                    <Text style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: '600' }}>
                      {sub.expiresAt
                        ? `Expires: ${new Date(sub.expiresAt).toLocaleDateString()}`
                        : 'Select a package below'}
                    </Text>
                  </View>
                  {isLocked ? (
                    <View
                      style={{
                        marginTop: 6,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: 'rgba(239,68,68,0.18)',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#FECACA', lineHeight: 17, fontWeight: '600' }}>
                        Your restaurant data, menu, and orders are safely preserved. Subscribe below to unlock full access immediately after Super Admin verification.
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Monthly / Yearly Toggle */}
                <View
                  style={[
                    styles.toggleWrap,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                  ]}
                >
                  {(['monthly', 'yearly'] as const).map((c) => {
                    const active = billingCycle === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setBillingCycle(c)}
                        style={[
                          styles.toggleBtn,
                          { backgroundColor: active ? colors.primary : 'transparent', borderRadius: radii.md },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: active ? '#FFFFFF' : colors.textSecondary,
                          }}
                        >
                          {c === 'monthly' ? 'Monthly Billing' : 'Yearly (Save 2 Mos)'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Dynamic Packages from Backend */}
                {subData.packages.map((pkg, idx) => {
                  const priceMinor = billingCycle === 'yearly' ? pkg.yearlyPriceMinor : pkg.monthlyPriceMinor;
                  const isPopular = idx === 1;
                  return (
                    <View
                      key={pkg.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isPopular ? colors.primary : colors.border,
                          borderWidth: isPopular ? 2 : 1,
                          borderRadius: radii.xl,
                        },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary }}>
                          {pkg.name}
                        </Text>
                        {isPopular ? <StatusBadge label="MOST POPULAR" tone="info" /> : null}
                      </View>
                      <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>{pkg.description}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                        <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>
                          {formatMoney(priceMinor)}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: colors.textSecondary, fontWeight: '700' }}>
                          / {billingCycle === 'yearly' ? 'year' : 'month'}
                        </Text>
                      </View>
                      <View style={{ gap: 6, marginVertical: 4 }}>
                        {pkg.features.map((feat, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Check size={14} color={colors.primary} />
                            <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}>{feat}</Text>
                          </View>
                        ))}
                      </View>
                      <PrimaryButton
                        title={`Subscribe to ${pkg.name}`}
                        fullWidth
                        onPress={() => setPayPkg(pkg)}
                      />
                    </View>
                  );
                })}

                {/* Payment History */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                    Payment History
                  </Text>
                  {subData.payments.length === 0 ? (
                    <EmptyState
                      title="No payments submitted yet"
                      description="Select a package above when you are ready to subscribe or renew."
                    />
                  ) : (
                    subData.payments.map((p) => (
                      <View
                        key={p.id}
                        style={[
                          styles.card,
                          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                        ]}
                      >
                        <View style={styles.rowBetween}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                            {p.packageName} ({p.billingCycle})
                          </Text>
                          <StatusBadge
                            label={p.status.toUpperCase()}
                            tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'error' : 'warning'}
                          />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.primary }}>
                          {formatMoney(p.amountMinor)} · {p.paymentMethod.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                          TID: {p.transactionRef} · {new Date(p.createdAt).toLocaleDateString()}
                        </Text>
                        {p.status === 'rejected' && p.rejectionReason ? (
                          <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                            Reason: {p.rejectionReason}
                          </Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* TAB 5: KITCHEN PROFILE & SWITCHER */}
            {tab === 'kitchen' ? (
              <View style={{ gap: 14 }}>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                    {user?.fullName ?? 'Restaurant Partner'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{user?.email}</Text>
                </View>

                {myRestaurants.length > 1 ? (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                    ]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                      Switch Active Restaurant
                    </Text>
                    {myRestaurants.map((r) => {
                      const active = r.id === restId;
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => {
                            setSelectedRestId(r.id);
                            showToast(`Switched to ${r.name}`, 'info');
                          }}
                          style={[
                            styles.switchRow,
                            {
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active ? colors.primarySoft : colors.background,
                              borderRadius: radii.md,
                            },
                          ]}
                        >
                          <Store size={16} color={active ? colors.primary : colors.textSecondary} />
                          <Text style={{ flex: 1, fontWeight: '800', color: colors.textPrimary }}>{r.name}</Text>
                          {active ? <CheckCircle2 size={16} color={colors.primary} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <SecondaryButton
                  title="Sign Out"
                  fullWidth
                  onPress={() => void handleLogout()}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Bottom 5-Tab Navigation Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {(
          [
            { key: 'overview', label: 'Home', Icon: LayoutDashboard, locked: isLocked },
            { key: 'orders', label: 'Orders', Icon: ShoppingBag, locked: isLocked },
            { key: 'menu', label: 'Menu', Icon: ChefHat, locked: isLocked },
            { key: 'plans', label: 'Plans', Icon: CreditCard, locked: false },
            { key: 'kitchen', label: 'Kitchen', Icon: Store, locked: false },
          ] as const
        ).map((item) => {
          const active = tab === item.key;
          const IconComp = item.locked ? Lock : item.Icon;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (item.locked) {
                  showToast('Renew your subscription to unlock this section.', 'error');
                  setTab('plans');
                  return;
                }
                setTab(item.key);
              }}
              style={styles.navItem}
            >
              <IconComp size={20} color={active ? colors.primary : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? '800' : '600',
                  color: active ? colors.primary : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Payment Submission Modal */}
      <Modal visible={Boolean(payPkg)} animationType="slide" transparent onRequestClose={() => setPayPkg(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.textPrimary }}>
                Pay for {payPkg?.name} ({billingCycle})
              </Text>
              <Pressable onPress={() => setPayPkg(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
              {payPkg ? (
                <View style={[styles.payInfoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textSecondary }}>
                      Amount Due
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>
                      {formatMoney(billingCycle === 'yearly' ? payPkg.yearlyPriceMinor : payPkg.monthlyPriceMinor)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12.5, color: colors.textPrimary, lineHeight: 18, marginTop: 6 }}>
                    {subData?.paymentInstructions || 'Easypaisa: 0329-5931738 | JazzCash: 0329-5931738'}
                  </Text>
                </View>
              ) : null}

              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSecondary }}>PAYMENT METHOD</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    { key: 'easypaisa', label: 'Easypaisa' },
                    { key: 'jazzcash', label: 'JazzCash' },
                    { key: 'bank_transfer', label: 'Bank IBFT' },
                    { key: 'card', label: 'Card' },
                  ] as const
                ).map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setPayMethod(m.key)}
                    style={[
                      styles.pillBtn,
                      {
                        backgroundColor: payMethod === m.key ? colors.primary : colors.background,
                        borderColor: payMethod === m.key ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: payMethod === m.key ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <InputField
                label="Transaction Reference ID (TID) *"
                placeholder="e.g. TXN-884920192"
                value={txnRef}
                onChangeText={setTxnRef}
              />
              <InputField
                label="Your Sender Mobile / Account"
                placeholder="03XX-XXXXXXX"
                value={senderAcct}
                onChangeText={setSenderAcct}
              />
              <InputField
                label="Receipt Screenshot URL (Optional)"
                placeholder="https://..."
                value={proofUrl}
                onChangeText={setProofUrl}
              />
              <InputField
                label="Notes (Optional)"
                placeholder="Any note for admin"
                value={payNotes}
                onChangeText={setPayNotes}
              />

              <PrimaryButton
                title="Submit Payment for Verification"
                fullWidth
                loading={submittingPay}
                onPress={() => void handleSubmitPayment()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Dish Modal */}
      <Modal visible={addFoodOpen} animationType="slide" transparent onRequestClose={() => setAddFoodOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.textPrimary }}>Add New Dish</Text>
              <Pressable onPress={() => setAddFoodOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ gap: 12, paddingVertical: 10 }}>
              <InputField label="Dish Name *" placeholder="e.g. Chicken Biryani" value={foodName} onChangeText={setFoodName} />
              <InputField label="Price (PKR) *" placeholder="e.g. 650" keyboardType="numeric" value={foodPricePkr} onChangeText={setFoodPricePkr} />
              <InputField label="Prep Time (mins)" placeholder="20" keyboardType="numeric" value={foodPrep} onChangeText={setFoodPrep} />
              <InputField label="Description" placeholder="Freshly cooked with basmati rice" value={foodDesc} onChangeText={setFoodDesc} />
              <PrimaryButton
                title="Save Dish to Live Menu"
                fullWidth
                loading={savingFood}
                onPress={() => void handleAddFood()}
              />
            </View>
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
    gap: 10,
  },
  headerSub: { fontSize: 10, fontWeight: '800', color: '#FDBA74', letterSpacing: 0.8 },
  headerTitle: { fontSize: 19, fontWeight: '900', color: '#FFFFFF' },
  daysChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  scroll: { padding: 16, gap: 14, paddingBottom: 24 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', padding: 14, borderWidth: 1 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  subHero: { backgroundColor: '#0F172A', padding: 18, gap: 6 },
  toggleWrap: { flexDirection: 'row', padding: 4, borderWidth: 1, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
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
  payInfoBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
});
