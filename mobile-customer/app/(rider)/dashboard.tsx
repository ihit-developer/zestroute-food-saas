import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  Banknote,
  Bike,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  Radio,
  RefreshCw,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  IconButton,
  InputField,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { httpClient, tokenStorage } from '../../services/apiClient';
import { saveAccount } from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';
import { playAlertChime } from '../../utils/soundAlert';

interface ActiveDeliveryInfo {
  deliveryId: string;
  orderId: string;
  orderNumber: string;
  status: 'assigned' | 'picked_up' | 'on_the_way';
  restaurantName: string;
  pickupLocation: string;
  dropoffArea: string;
  dropoffAddress: string;
  instructions?: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  orderTotalMinor: number;
  earningMinor: number;
  distanceKm: number;
}

interface RiderPayoutItem {
  id: string;
  amountMinor: number;
  status: string;
  createdAt: string;
}

interface RiderDashboardStats {
  isOnline: boolean;
  status: string;
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleNumber: string;
  todayDeliveries: number;
  completedDeliveries: number;
  todayEarningsMinor: number;
  weeklyEarningsMinor: number;
  monthlyEarningsMinor: number;
  codCashTodayMinor?: number;
  codCashTotalMinor?: number;
  availableBalanceMinor?: number;
  withdrawnMinor?: number;
  payouts?: RiderPayoutItem[];
  ratingAvg: number;
  ratingCount: number;
  activeDelivery: ActiveDeliveryInfo | null;
}

interface DeliveryRequestItem {
  assignmentId: string;
  deliveryId: string;
  orderNumber: string;
  orderStatus?: string;
  customerName?: string;
  paymentMethod: string;
  orderTotalMinor: number;
  restaurantName: string;
  pickupLocation: string;
  dropoffArea: string;
  distanceKm: number;
  distanceToPickupKm?: number;
  onlineRidersCount?: number;
  estimatedEarningMinor: number;
  instructions?: string;
}

interface DeliveryHistoryItem {
  id: string;
  orderNumber: string;
  restaurantName: string;
  area: string;
  paymentMethod: string;
  status: string;
  earningMinor: number;
  tipMinor: number;
  createdAt: string;
}

interface RiderProfileData {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleNumber: string;
  licenseNumber: string;
  cnicMasked: string;
  status: string;
  isOnline: boolean;
  ratingAvg: number;
  completedCount: number;
  payoutMethod?: 'jazzcash' | 'easypaisa' | 'bank';
  payoutAccountTitle?: string;
  payoutAccountNumber?: string;
}

type RiderTab = 'overview' | 'requests' | 'wallet' | 'history' | 'profile';

export default function UnifiedRiderDashboardScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);

  const [tab, setTab] = useState<RiderTab>('overview');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [payoutFilter, setPayoutFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [withdrawPkr, setWithdrawPkr] = useState('');
  const [gpsStep, setGpsStep] = useState(0);
  const prevReqCountRef = useRef<number>(0);

  const [stats, setStats] = useState<RiderDashboardStats>({
    isOnline: false,
    status: 'approved',
    vehicleType: 'bike',
    vehicleNumber: '',
    todayDeliveries: 0,
    completedDeliveries: 0,
    todayEarningsMinor: 0,
    weeklyEarningsMinor: 0,
    monthlyEarningsMinor: 0,
    ratingAvg: 0,
    ratingCount: 0,
    activeDelivery: null,
  });
  const [requests, setRequests] = useState<DeliveryRequestItem[]>([]);
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [profile, setProfile] = useState<RiderProfileData | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'car'>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [cnicMasked, setCnicMasked] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'jazzcash' | 'easypaisa' | 'bank'>('jazzcash');
  const [payoutAccountTitle, setPayoutAccountTitle] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dash, reqs, hist, prof] = await Promise.all([
        httpClient.get<RiderDashboardStats>('/rider/dashboard').catch(() => null),
        httpClient.get<DeliveryRequestItem[]>('/rider/requests').catch(() => []),
        httpClient.get<DeliveryHistoryItem[]>('/rider/history').catch(() => []),
        httpClient.get<RiderProfileData>('/rider/profile').catch(() => null),
      ]);

      if (dash) {
        setStats(dash);
        setIsOnline(Boolean(dash.isOnline));
      }
      const nextReqs = Array.isArray(reqs) ? reqs : [];
      if (silent && nextReqs.length > prevReqCountRef.current) {
        playAlertChime('rider_offer');
        showToast(`New delivery request received (${nextReqs.length} open)!`, 'info');
      }
      prevReqCountRef.current = nextReqs.length;
      setRequests(nextReqs);
      setHistory(Array.isArray(hist) ? hist : []);
      if (prof) {
        setProfile(prof);
        if (!silent) {
          setFullName(prof.fullName || '');
          setPhone(prof.phone || '');
          setVehicleType(prof.vehicleType || 'bike');
          setVehicleNumber(prof.vehicleNumber || '');
          setLicenseNumber(prof.licenseNumber || '');
          setCnicMasked(prof.cnicMasked || '');
          setPayoutMethod(prof.payoutMethod || 'jazzcash');
          setPayoutAccountTitle(prof.payoutAccountTitle || '');
          setPayoutAccountNumber(prof.payoutAccountNumber || '');
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(false);
    const timer = setInterval(() => {
      void loadAll(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const handleToggleOnline = async (next: boolean) => {
    setIsOnline(next);
    try {
      await httpClient.patch('/rider/status', { isOnline: next });
      showToast(next ? 'You are Online — ready for deliveries!' : 'You are now Offline', 'success');
      await loadAll(true);
    } catch (err) {
      setIsOnline(!next);
      showToast(err instanceof Error ? err.message : 'Unable to update duty status', 'error');
    }
  };

  const handleAccept = async (assignmentId: string) => {
    setBusyAction(assignmentId);
    try {
      await httpClient.post(`/rider/requests/${assignmentId}/accept`, {});
      showToast('Delivery accepted! Head to the restaurant for pickup.', 'success');
      setTab('overview');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to accept delivery', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDecline = async (assignmentId: string) => {
    setBusyAction(assignmentId);
    try {
      await httpClient.post(`/rider/requests/${assignmentId}/decline`, {});
      showToast('Request declined', 'info');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to decline request', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleMarkPickedUp = async (deliveryId: string) => {
    setBusyAction('pickup');
    try {
      await httpClient.patch(`/rider/deliveries/${deliveryId}/pickup`, {});
      showToast('Order picked up from restaurant!', 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to mark picked up', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleMarkOnTheWay = async (deliveryId: string) => {
    setBusyAction('on_the_way');
    try {
      await httpClient.patch(`/rider/deliveries/${deliveryId}/on-the-way`, {});
      showToast('Customer notified: You are on the way!', 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update trip status', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCompleteDelivery = async (deliveryId: string) => {
    if (deliveryOtp.trim().length < 4) {
      showToast('Enter the customer delivery OTP to complete', 'error');
      return;
    }
    setBusyAction('complete');
    try {
      await httpClient.post(`/rider/deliveries/${deliveryId}/complete`, {
        otp: deliveryOtp.trim(),
        proofPhotoUrl: proofPhotoUrl.trim() || undefined,
      });
      setDeliveryOtp('');
      setProofPhotoUrl('');
      showToast('Delivery completed! Earnings added to your wallet.', 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid delivery OTP', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareLiveGps = async (deliveryId: string) => {
    setBusyAction('gps');
    try {
      const nextStep = gpsStep + 1;
      setGpsStep(nextStep);
      const lat = 31.5204 - Math.min(nextStep, 10) * 0.001;
      const lng = 74.3487 + Math.min(nextStep, 10) * 0.001;
      await httpClient.post(`/rider/deliveries/${deliveryId}/location`, {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        speed: 28,
        heading: 135,
      });
      showToast(`Live GPS pin broadcast (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send GPS location', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestPayout = async () => {
    const pkr = Number(withdrawPkr);
    if (!Number.isFinite(pkr) || pkr < 100) {
      showToast('Enter withdrawal amount (minimum PKR 100)', 'error');
      return;
    }
    setBusyAction('payout');
    try {
      await httpClient.post('/rider/payouts/request', { amountMinor: Math.round(pkr * 100) });
      setWithdrawPkr('');
      showToast(`Payout request of PKR ${pkr} submitted!`, 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit payout request', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const openGoogleMapsNav = (query: string) => {
    const encoded = encodeURIComponent(query || 'Lahore');
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await httpClient.patch<RiderProfileData>('/rider/profile', {
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim(),
        licenseNumber: licenseNumber.trim(),
        cnicMasked: cnicMasked.trim(),
        payoutMethod,
        payoutAccountTitle: payoutAccountTitle.trim(),
        payoutAccountNumber: payoutAccountNumber.trim(),
      });
      setProfile(updated);
      if (user) {
        setSession({
          ...user,
          fullName: updated.fullName,
          phone: updated.phone,
        });
      }
      showToast('Rider profile updated & saved!', 'success');
      await loadAll(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast('Enter your current password', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await httpClient.patch('/rider/password', {
        currentPassword,
        newPassword,
      });
      if (profile?.email || user?.email) {
        await saveAccount({
          identifier: profile?.email || user?.email || '',
          password: newPassword,
          fullName: profile?.fullName || user?.fullName || 'Rider',
          role: 'rider',
        }).catch(() => {});
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await tokenStorage.clearTokens();
    setSession(null);
    router.replace('/(auth)/welcome');
  };

  const activeDel = stats.activeDelivery;
  const deliveredHistory = history.filter((h) => h.status === 'delivered');
  const cancelledHistory = history.filter((h) => h.status === 'cancelled');
  const visibleHistory =
    historyFilter === 'delivered'
      ? deliveredHistory
      : historyFilter === 'cancelled'
        ? cancelledHistory
        : history;
  const totalHistoryEarned = deliveredHistory.reduce((sum, h) => sum + (h.earningMinor ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Pro Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Bike size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {profile?.fullName || user?.fullName || 'Rider Partner'}
              </Text>
              <View style={[styles.liveDot, { backgroundColor: isOnline ? '#16A34A' : '#94A3B8' }]} />
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {isOnline ? 'Online · Receiving live requests' : 'Offline · Toggle duty to start'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <IconButton
            icon={<RefreshCw size={17} color={colors.textPrimary} />}
            accessibilityLabel="Refresh"
            onPress={() => void loadAll(false)}
          />
          <IconButton
            icon={<LogOut size={17} color={colors.error} />}
            accessibilityLabel="Sign Out"
            onPress={() => void handleLogout()}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Duty Control Hero Card */}
        <View
          style={[
            styles.dutyHero,
            {
              backgroundColor: isOnline ? '#0F172A' : colors.surface,
              borderColor: isOnline ? '#16A34A' : colors.border,
              borderRadius: radii.xl,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.statusPill, { backgroundColor: isOnline ? 'rgba(22,163,74,0.22)' : colors.primarySoft }]}>
                  <View style={[styles.liveDot, { backgroundColor: isOnline ? '#22C55E' : colors.primary }]} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isOnline ? '#4ADE80' : colors.primary }}>
                    {isOnline ? 'ON DUTY · LIVE' : 'OFF DUTY'}
                  </Text>
                </View>
                {stats.vehicleNumber ? (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isOnline ? '#CBD5E1' : colors.textSecondary }}>
                    {stats.vehicleType.toUpperCase()} · {stats.vehicleNumber}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: isOnline ? '#FFFFFF' : colors.textPrimary }}>
                {isOnline ? 'Ready for Pickup Offers' : 'Go Online to Start Earning'}
              </Text>
              <Text style={{ fontSize: 12, color: isOnline ? '#94A3B8' : colors.textSecondary }}>
                {requests.length > 0
                  ? `${requests.length} live delivery request${requests.length > 1 ? 's' : ''} waiting`
                  : 'Auto-syncs every 6 seconds with nearby kitchens'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(v) => void handleToggleOnline(v)}
              trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Active Delivery Live Card (Shows Whenever Rider Has an Active Order) */}
        {activeDel ? (
          <View
            style={[
              styles.activeDeliveryCard,
              { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.xl },
            ]}
          >
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Navigation size={18} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  Active Delivery · {activeDel.orderNumber}
                </Text>
              </View>
              <StatusBadge label={activeDel.status.replace(/_/g, ' ').toUpperCase()} tone="primary" />
            </View>

            {/* 4-Step Live Trip Progress Bar */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(
                [
                  { key: 'assigned', label: '1. Accepted' },
                  { key: 'picked_up', label: '2. Picked Up' },
                  { key: 'on_the_way', label: '3. On Way' },
                  { key: 'delivered', label: '4. Done' },
                ] as const
              ).map((step, idx) => {
                const curIdx =
                  activeDel.status === 'assigned'
                    ? 0
                    : activeDel.status === 'picked_up'
                      ? 1
                      : 2;
                const reached = idx <= curIdx;
                return (
                  <View key={step.key} style={{ flex: 1, gap: 4 }}>
                    <View
                      style={{
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: reached ? colors.primary : colors.border,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: reached ? '800' : '600',
                        color: reached ? colors.primary : colors.textSecondary,
                        textAlign: 'center',
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.routeBox, { backgroundColor: colors.background, borderRadius: radii.md }]}>
              <View style={styles.row}>
                <Store size={15} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>PICKUP FROM</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    {activeDel.restaurantName}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{activeDel.pickupLocation}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

              <View style={styles.row}>
                <MapPin size={15} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>DELIVER TO</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    {activeDel.customerName} {activeDel.customerPhone ? `· ${activeDel.customerPhone}` : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{activeDel.dropoffAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
                {activeDel.paymentMethod.toUpperCase()} · Order {formatMoney(activeDel.orderTotalMinor)}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>
                Your Pay: {formatMoney(activeDel.earningMinor)}
              </Text>
            </View>

            {/* 1-Tap Google Maps Navigation, Call Customer & Live GPS Broadcast */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => openGoogleMapsNav(`${activeDel.restaurantName}, ${activeDel.pickupLocation}`)}
                style={[styles.quickActionPill, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              >
                <ExternalLink size={13} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>Nav Kitchen</Text>
              </Pressable>

              <Pressable
                onPress={() => openGoogleMapsNav(activeDel.dropoffAddress)}
                style={[styles.quickActionPill, { backgroundColor: 'rgba(22,163,74,0.12)', borderColor: '#16A34A' }]}
              >
                <Navigation size={13} color="#16A34A" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A' }}>Nav Customer</Text>
              </Pressable>

              {activeDel.customerPhone ? (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${activeDel.customerPhone}`)}
                  style={[styles.quickActionPill, { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: '#2563EB' }]}
                >
                  <Phone size={13} color="#2563EB" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>Call</Text>
                </Pressable>
              ) : null}

              <Pressable
                disabled={busyAction !== null}
                onPress={() => void handleShareLiveGps(activeDel.deliveryId)}
                style={[styles.quickActionPill, { backgroundColor: 'rgba(124,58,237,0.12)', borderColor: '#7C3AED' }]}
              >
                <Radio size={13} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>
                  {busyAction === 'gps' ? 'Sending...' : 'Update GPS Pin'}
                </Text>
              </Pressable>
            </View>

            {activeDel.status === 'assigned' ? (
              <PrimaryButton
                title={busyAction === 'pickup' ? 'Updating...' : 'Confirm Order Picked Up'}
                fullWidth
                disabled={busyAction !== null}
                onPress={() => void handleMarkPickedUp(activeDel.deliveryId)}
              />
            ) : activeDel.status === 'picked_up' ? (
              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title={busyAction === 'on_the_way' ? 'Updating...' : 'Start Trip (On The Way)'}
                  fullWidth
                  disabled={busyAction !== null}
                  onPress={() => void handleMarkOnTheWay(activeDel.deliveryId)}
                />
                <InputField
                  label="Or enter Customer OTP to complete delivery"
                  placeholder="4-digit customer OTP"
                  keyboardType="number-pad"
                  value={deliveryOtp}
                  onChangeText={setDeliveryOtp}
                />
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Proof of Delivery Photo (Optional)"
                      placeholder="Photo URL or tap Attach"
                      value={proofPhotoUrl}
                      onChangeText={setProofPhotoUrl}
                    />
                  </View>
                  <Pressable
                    onPress={() =>
                      setProofPhotoUrl(
                        'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800'
                      )
                    }
                    style={[
                      styles.photoBtn,
                      { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.md },
                    ]}
                  >
                    <Camera size={16} color={colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>Snap</Text>
                  </Pressable>
                </View>
                <SecondaryButton
                  title={busyAction === 'complete' ? 'Verifying OTP...' : 'Complete Delivery'}
                  fullWidth
                  disabled={busyAction !== null}
                  onPress={() => void handleCompleteDelivery(activeDel.deliveryId)}
                />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <InputField
                  label="Customer Delivery OTP"
                  placeholder="Ask customer for 4-digit delivery OTP"
                  keyboardType="number-pad"
                  value={deliveryOtp}
                  onChangeText={setDeliveryOtp}
                />
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Proof of Delivery Photo (Optional)"
                      placeholder="Photo URL or tap Snap"
                      value={proofPhotoUrl}
                      onChangeText={setProofPhotoUrl}
                    />
                  </View>
                  <Pressable
                    onPress={() =>
                      setProofPhotoUrl(
                        'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800'
                      )
                    }
                    style={[
                      styles.photoBtn,
                      { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.md },
                    ]}
                  >
                    <Camera size={16} color={colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>Snap</Text>
                  </Pressable>
                </View>
                <PrimaryButton
                  title={busyAction === 'complete' ? 'Completing...' : 'Verify OTP & Complete Delivery'}
                  fullWidth
                  disabled={busyAction !== null}
                  onPress={() => void handleCompleteDelivery(activeDel.deliveryId)}
                />
              </View>
            )}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : tab === 'overview' ? (
          /* TAB 1: EXECUTIVE RIDER OVERVIEW */
          <View style={{ gap: 14 }}>
            {/* Earnings Highlight Card */}
            <View style={[styles.earningsHero, { backgroundColor: colors.primary, borderRadius: radii.xl }]}>
              <View style={styles.rowBetween}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#FFE4CC', fontSize: 12, fontWeight: '700' }}>TODAY'S EARNINGS</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>
                    {formatMoney(stats.todayEarningsMinor)}
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Wallet size={24} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.earningsSplitRow}>
                <View style={styles.earningsSplitBox}>
                  <Text style={{ color: '#FFE4CC', fontSize: 11, fontWeight: '700' }}>WEEKLY (7D)</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {formatMoney(stats.weeklyEarningsMinor)}
                  </Text>
                </View>
                <View style={styles.earningsSplitBox}>
                  <Text style={{ color: '#FFE4CC', fontSize: 11, fontWeight: '700' }}>MONTHLY (30D)</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {formatMoney(stats.monthlyEarningsMinor)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 6 Real-Time Performance KPI Cards */}
            <View style={styles.grid}>
              {[
                {
                  label: "Today's Deliveries",
                  val: String(stats.todayDeliveries),
                  icon: <Package size={17} color="#EA580C" />,
                  tint: 'rgba(234, 88, 12, 0.12)',
                },
                {
                  label: 'Completed Total',
                  val: String(stats.completedDeliveries),
                  icon: <CheckCircle2 size={17} color="#16A34A" />,
                  tint: 'rgba(22, 163, 74, 0.12)',
                },
                {
                  label: "Today's Earnings",
                  val: formatMoney(stats.todayEarningsMinor),
                  icon: <DollarSign size={17} color="#2563EB" />,
                  tint: 'rgba(37, 99, 235, 0.12)',
                },
                {
                  label: 'Weekly Earnings',
                  val: formatMoney(stats.weeklyEarningsMinor),
                  icon: <TrendingUp size={17} color="#7C3AED" />,
                  tint: 'rgba(124, 58, 237, 0.12)',
                },
                {
                  label: 'Monthly Earnings',
                  val: formatMoney(stats.monthlyEarningsMinor),
                  icon: <Calendar size={17} color="#0284C7" />,
                  tint: 'rgba(2, 132, 199, 0.12)',
                },
                {
                  label: 'Average Rating',
                  val: stats.ratingAvg > 0 ? `${stats.ratingAvg.toFixed(1)} (${stats.ratingCount})` : '5.0 (New)',
                  icon: <Star size={17} color="#F59E0B" fill="#F59E0B" />,
                  tint: 'rgba(245, 158, 11, 0.14)',
                },
              ].map((kpi) => (
                <View
                  key={kpi.label}
                  style={[
                    styles.kpiCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                  ]}
                >
                  <View style={[styles.kpiIcon, { backgroundColor: kpi.tint }]}>{kpi.icon}</View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                    {kpi.label}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                    {kpi.val}
                  </Text>
                </View>
              ))}
            </View>

            <PrimaryButton
              title={`View Live Delivery Requests (${requests.length})`}
              fullWidth
              onPress={() => setTab('requests')}
            />
            <SecondaryButton
              title={`Open COD & Payout Wallet (${formatMoney(stats.availableBalanceMinor ?? 0)} avail)`}
              fullWidth
              onPress={() => setTab('wallet')}
            />
          </View>
        ) : tab === 'wallet' ? (
          /* TAB 3: DEDICATED COD CASH & PAYOUT WALLET TAB */
          <View style={{ gap: 14 }}>
            {/* Executive Wallet Hero Card */}
            <View
              style={[
                styles.earningsHero,
                { backgroundColor: '#0F172A', borderRadius: radii.xl },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>
                    AVAILABLE TO WITHDRAW
                  </Text>
                  <Text style={{ color: '#4ADE80', fontSize: 30, fontWeight: '900' }}>
                    {formatMoney(stats.availableBalanceMinor ?? 0)}
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                    {(profile?.payoutMethod ?? 'jazzcash').toUpperCase()}
                    {profile?.payoutAccountNumber ? ` · ${profile.payoutAccountNumber}` : ' · Add account in Profile'}
                  </Text>
                </View>
                <View style={[styles.heroBadge, { backgroundColor: 'rgba(74,222,128,0.16)' }]}>
                  <Wallet size={24} color="#4ADE80" />
                </View>
              </View>

              <View style={styles.earningsSplitRow}>
                <View style={[styles.earningsSplitBox, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={{ color: '#94A3B8', fontSize: 10.5, fontWeight: '800' }}>TOTAL PAID OUT</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                    {formatMoney(stats.withdrawnMinor ?? 0)}
                  </Text>
                </View>
                <View style={[styles.earningsSplitBox, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={{ color: '#94A3B8', fontSize: 10.5, fontWeight: '800' }}>COD COLLECTED</Text>
                  <Text style={{ color: '#FDBA74', fontSize: 16, fontWeight: '800' }}>
                    {formatMoney(stats.codCashTotalMinor ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* COD Breakdown Strip */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              <View style={styles.row}>
                <Banknote size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  Cash on Delivery (COD) Summary
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.miniStatBox, { backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.textSecondary }}>COD TODAY</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                    {formatMoney(stats.codCashTodayMinor ?? 0)}
                  </Text>
                </View>
                <View style={[styles.miniStatBox, { backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.textSecondary }}>LIFETIME COD</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                    {formatMoney(stats.codCashTotalMinor ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Request Withdrawal Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, gap: 12 },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  Withdraw Earnings
                </Text>
                {(stats.availableBalanceMinor ?? 0) >= 10000 ? (
                  <Pressable
                    onPress={() => setWithdrawPkr(String(Math.floor((stats.availableBalanceMinor ?? 0) / 100)))}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                      Use Full Balance
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {(stats.availableBalanceMinor ?? 0) >= 10000 ? (
                <>
                  <InputField
                    label={`Amount to ${(profile?.payoutMethod ?? 'jazzcash').toUpperCase()} (PKR)`}
                    placeholder={`Min 100 · Max ${Math.floor((stats.availableBalanceMinor ?? 0) / 100)} PKR`}
                    keyboardType="numeric"
                    value={withdrawPkr}
                    onChangeText={setWithdrawPkr}
                  />
                  <PrimaryButton
                    title={busyAction === 'payout' ? 'Submitting Request...' : 'Request Payout Withdrawal'}
                    fullWidth
                    disabled={busyAction !== null}
                    onPress={() => void handleRequestPayout()}
                  />
                </>
              ) : (
                <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 }}>
                  {(stats.withdrawnMinor ?? 0) > 0
                    ? 'All your earned payouts have been settled. Complete more deliveries to unlock your next withdrawal (min PKR 100).'
                    : 'Complete deliveries to build your available balance. Minimum withdrawal is PKR 100.'}
                </Text>
              )}
            </View>

            {/* Payout History with Filter Pills */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, gap: 12 },
              ]}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                Payout History ({(stats.payouts ?? []).length})
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'paid', label: 'Paid ✓' },
                  ] as const
                ).map((f) => {
                  const active = payoutFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setPayoutFilter(f.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.background,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: active ? colors.primary : colors.textSecondary,
                        }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {(() => {
                const filteredPayouts = (stats.payouts ?? []).filter((p) => {
                  if (payoutFilter === 'pending') return p.status === 'pending';
                  if (payoutFilter === 'paid') return p.status === 'paid';
                  return true;
                });
                if (filteredPayouts.length === 0) {
                  return (
                    <Text style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }}>
                      No payout records in this filter.
                    </Text>
                  );
                }
                return filteredPayouts.map((p) => {
                  const isPaid = p.status === 'paid';
                  const isFailed = p.status === 'failed';
                  return (
                    <View
                      key={p.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radii.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                          {formatMoney(p.amountMinor)}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: colors.textSecondary }}>
                          {new Date(p.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <StatusBadge
                        label={isPaid ? 'PAID ✓' : isFailed ? 'DECLINED' : 'PENDING'}
                        tone={isPaid ? 'success' : isFailed ? 'error' : 'warning'}
                      />
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        ) : tab === 'requests' ? (
          /* TAB 2: LIVE MULTI-RIDER DELIVERY REQUESTS */
          requests.length === 0 ? (
            <EmptyState
              title={
                stats.activeDelivery
                  ? 'Active delivery in progress'
                  : isOnline
                    ? 'Listening for live customer orders...'
                    : 'You are currently Offline'
              }
              description={
                stats.activeDelivery
                  ? 'Complete your active delivery first to receive new customer delivery broadcasts.'
                  : isOnline
                    ? 'You are Online in the live rider dispatch pool! As soon as any customer places an order, it broadcasts here to nearby online riders (first to accept wins).'
                    : 'Turn Online above so nearby customer orders broadcast to your phone in real time.'
              }
              actionLabel={isOnline ? 'Refresh Queue' : 'Go Online Now'}
              onAction={() => {
                if (!isOnline) {
                  void httpClient
                    .patch('/rider/online', { isOnline: true })
                    .then(() => {
                      setIsOnline(true);
                      void loadAll(false);
                      showToast('You are now Online & receiving live requests!', 'success');
                    })
                    .catch(() => showToast('Unable to go online', 'error'));
                } else {
                  void loadAll(false);
                }
              }}
            />
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: radii.md,
                  backgroundColor: 'rgba(22,163,74,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(22,163,74,0.3)',
                }}
              >
                <Radio size={15} color="#16A34A" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D', flex: 1 }}>
                  LIVE MULTI-RIDER DISPATCH · Sorted by closest pickup · First to Accept wins
                </Text>
              </View>
              {requests.map((req) => (
                <View
                  key={req.assignmentId}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                        {req.restaurantName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {req.orderNumber} · {req.customerName ?? 'Customer'} · {req.paymentMethod.toUpperCase()} ({formatMoney(req.orderTotalMinor)})
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge label={`${req.distanceKm.toFixed(1)} km`} tone="info" />
                      {req.orderStatus ? (
                        <StatusBadge
                          label={req.orderStatus.replace(/_/g, ' ').toUpperCase()}
                          tone={req.orderStatus === 'ready_for_pickup' ? 'success' : 'warning'}
                        />
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.routeBox, { backgroundColor: colors.background, borderRadius: radii.md }]}>
                    <View style={styles.row}>
                      <Store size={14} color={colors.primary} />
                      <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}>
                        Pickup: {req.pickupLocation}
                        {typeof req.distanceToPickupKm === 'number' ? ` (${req.distanceToPickupKm.toFixed(1)} km away)` : ''}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <MapPin size={14} color="#16A34A" />
                      <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}>
                        Dropoff: {req.dropoffArea} ({req.customerName ?? 'Customer'})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                      ESTIMATED PAYOUT
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#16A34A' }}>
                      {formatMoney(req.estimatedEarningMinor)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton
                        title="Decline"
                        fullWidth
                        disabled={busyAction !== null}
                        onPress={() => void handleDecline(req.assignmentId)}
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <PrimaryButton
                        title={busyAction === req.assignmentId ? 'Accepting...' : 'Accept Delivery'}
                        fullWidth
                        disabled={busyAction !== null}
                        onPress={() => void handleAccept(req.assignmentId)}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : tab === 'history' ? (
          /* TAB 3: DELIVERY HISTORY */
          <View style={{ gap: 12 }}>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                    DELIVERED TRIPS
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary }}>
                    {deliveredHistory.length}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                    TOTAL EARNED
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#16A34A' }}>
                    {formatMoney(totalHistoryEarned)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(
                  [
                    { key: 'all', label: `All (${history.length})` },
                    { key: 'delivered', label: `Delivered (${deliveredHistory.length})` },
                    { key: 'cancelled', label: `Cancelled (${cancelledHistory.length})` },
                  ] as const
                ).map((f) => {
                  const active = historyFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setHistoryFilter(f.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.background,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: active ? colors.primary : colors.textSecondary,
                        }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {visibleHistory.length === 0 ? (
              <EmptyState
                title={historyFilter === 'cancelled' ? 'No cancelled trips' : 'No completed deliveries yet'}
                description="Your completed deliveries and cancelled trips will appear cleanly here."
              />
            ) : (
              visibleHistory.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                        {item.restaurantName} · {item.orderNumber}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {item.area || 'Lahore'} · {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <StatusBadge
                      label={item.status.toUpperCase()}
                      tone={item.status === 'delivered' ? 'success' : 'error'}
                    />
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {(item.paymentMethod || 'cod').toUpperCase()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: item.status === 'delivered' ? '#16A34A' : colors.textSecondary,
                      }}
                    >
                      {item.status === 'delivered' ? `+ ${formatMoney(item.earningMinor)}` : 'Cancelled (PKR 0)'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          /* TAB 4: RIDER PROFILE & VEHICLE UPDATE */
          <View style={{ gap: 14 }}>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              <View style={styles.row}>
                <View style={[styles.profileAvatar, { backgroundColor: colors.primarySoft }]}>
                  <User size={26} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                    {profile?.fullName || user?.fullName || 'Rider'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {profile?.email || user?.email || ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <StatusBadge
                      label={(profile?.status ?? 'approved').toUpperCase()}
                      tone={profile?.status === 'approved' ? 'success' : 'warning'}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Award size={14} color={colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                        {profile?.completedCount ?? stats.completedDeliveries} trips
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, gap: 12 },
              ]}
            >
              <View style={styles.row}>
                <ShieldCheck size={18} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  Edit Rider Profile &amp; Vehicle
                </Text>
              </View>

              <InputField
                label="Full Name"
                placeholder="Your full name"
                value={fullName}
                onChangeText={setFullName}
              />
              <InputField
                label="Phone Number"
                placeholder="+92300..."
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                  Vehicle Type
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['bike', 'scooter', 'car'] as const).map((vt) => {
                    const active = vehicleType === vt;
                    return (
                      <Pressable
                        key={vt}
                        onPress={() => setVehicleType(vt)}
                        style={[
                          styles.vehiclePill,
                          {
                            backgroundColor: active ? colors.primary : colors.background,
                            borderColor: active ? colors.primary : colors.border,
                            borderRadius: radii.md,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: active ? '#FFFFFF' : colors.textPrimary,
                          }}
                        >
                          {vt.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <InputField
                label="Vehicle Plate Number"
                placeholder="e.g., LEB-2026"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
              <InputField
                label="Driving License Number"
                placeholder="e.g., LHR-99210"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
              <InputField
                label="CNIC (Masked)"
                placeholder="e.g., 35202-*******-1"
                value={cnicMasked}
                onChangeText={setCnicMasked}
              />

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                Payout &amp; Withdrawal Account
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['jazzcash', 'easypaisa', 'bank'] as const).map((pm) => {
                  const active = payoutMethod === pm;
                  return (
                    <Pressable
                      key={pm}
                      onPress={() => setPayoutMethod(pm)}
                      style={[
                        styles.vehiclePill,
                        {
                          backgroundColor: active ? '#16A34A' : colors.background,
                          borderColor: active ? '#16A34A' : colors.border,
                          borderRadius: radii.md,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: active ? '#FFFFFF' : colors.textPrimary,
                        }}
                      >
                        {pm.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <InputField
                label="Account Title"
                placeholder="e.g., Ali Hassan"
                value={payoutAccountTitle}
                onChangeText={setPayoutAccountTitle}
              />
              <InputField
                label={payoutMethod === 'bank' ? 'Bank IBAN' : `${payoutMethod.toUpperCase()} Mobile Number`}
                placeholder={payoutMethod === 'bank' ? 'PK36...' : '03001234567'}
                value={payoutAccountNumber}
                onChangeText={setPayoutAccountNumber}
              />

              <PrimaryButton
                title={savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                fullWidth
                disabled={savingProfile}
                onPress={() => void handleSaveProfile()}
              />
            </View>

            {/* Rider Change Password Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, gap: 12 },
              ]}
            >
              <View style={styles.row}>
                <ShieldCheck size={18} color="#16A34A" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  Change Account Password
                </Text>
              </View>
              <InputField
                label="Current Password"
                placeholder="Enter current password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <InputField
                label="New Password (min 8 characters)"
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <InputField
                label="Confirm New Password"
                placeholder="Re-enter new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <PrimaryButton
                title={savingPassword ? 'Updating Password...' : 'Update Password'}
                fullWidth
                disabled={savingPassword}
                onPress={() => void handleChangePassword()}
              />
            </View>

            <SecondaryButton title="Sign Out of Rider Account" fullWidth onPress={() => void handleLogout()} />
          </View>
        )}
      </ScrollView>

      {/* Pro Bottom Tab Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {(
          [
            { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`, icon: Clock },
            { key: 'wallet', label: 'Wallet', icon: Wallet },
            { key: 'history', label: 'History', icon: History },
            { key: 'profile', label: 'Profile', icon: User },
          ] as const
        ).map((item) => {
          const IconComp = item.icon;
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.bottomTab}>
              <IconComp size={20} color={active ? colors.primary : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 11,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  liveDot: { width: 8, height: 8, borderRadius: 999 },
  scroll: { padding: 16, gap: 14, paddingBottom: 28 },
  dutyHero: { padding: 16, borderWidth: 1.5 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activeDeliveryCard: { padding: 16, borderWidth: 2, gap: 12 },
  routeBox: { padding: 12, gap: 8 },
  earningsHero: { padding: 18, gap: 14 },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsSplitRow: { flexDirection: 'row', gap: 10 },
  earningsSplitBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { width: '48%', padding: 14, borderWidth: 1, gap: 6 },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  photoBtn: {
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniStatBox: {
    flex: 1,
    padding: 10,
    gap: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
