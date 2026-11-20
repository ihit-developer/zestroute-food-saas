import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from 'lucide-react-native';
import { ORDER_STATUS_META, formatMoney, type OrderStatus } from '@zestroute/shared';
import { useTheme } from '../../../hooks/useTheme';
import {
  ErrorState,
  IconButton,
  PrimaryButton,
  StatusBadge,
  TopNav,
} from '../../../components/ui';
import { API_BASE_URL, httpClient, tokenStorage } from '../../../services/apiClient';
import { LiveTrackingMap, type LiveDeliveryMapData } from '../../../components/LiveTrackingMap';
import { playAlertChime } from '../../../utils/soundAlert';

interface TrackingOrderResponse {
  order: {
    _id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentMethod: string;
    paymentStatus: string;
    subtotalMinor: number;
    deliveryFeeMinor: number;
    taxMinor: number;
    totalMinor: number;
    currency: string;
    deliveryOtp?: string;
    createdAt: string;
    deliveryAddressSnapshot?: {
      fullName?: string;
      phone?: string;
      houseNumber?: string;
      street?: string;
      area?: string;
      city?: string;
    };
  };
  items: Array<{
    _id: string;
    nameSnapshot: string;
    variantNameSnapshot?: string;
    quantity: number;
    lineTotalMinor: number;
  }>;
  history: Array<{
    _id: string;
    toStatus: string;
    note?: string;
    createdAt: string;
  }>;
  delivery?: LiveDeliveryMapData | null;
}

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Waiting for restaurant to accept' },
  { key: 'confirmed', label: 'Order Accepted', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing Food', desc: 'Chef is cooking your meal fresh' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', desc: 'Packed and ready for dispatch' },
  { key: 'on_the_way', label: 'Out for Delivery', desc: 'Rider is heading to your address' },
  { key: 'delivered', label: 'Delivered', desc: 'Order delivered — enjoy your meal!' },
] as const;

function getProgressStep(status: string): number {
  if (status === 'pending') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'preparing') return 2;
  if (status === 'ready_for_pickup' || status === 'rider_assigned') return 3;
  if (status === 'picked_up' || status === 'on_the_way') return 4;
  if (status === 'delivered') return 5;
  return -1;
}

function getHeroCopy(status: string): { headline: string; eta: string } {
  switch (status) {
    case 'pending':
      return { headline: 'Waiting for Restaurant Confirmation', eta: '30–40 mins' };
    case 'confirmed':
      return { headline: 'Order Accepted by Kitchen', eta: '25–35 mins' };
    case 'preparing':
      return { headline: 'Your Food is Being Prepared', eta: '18–25 mins' };
    case 'ready_for_pickup':
    case 'rider_assigned':
      return { headline: 'Order Ready for Dispatch', eta: '12–18 mins' };
    case 'picked_up':
    case 'on_the_way':
      return { headline: 'Rider is On the Way to You', eta: '5–12 mins' };
    case 'delivered':
      return { headline: 'Order Delivered!', eta: 'Completed' };
    case 'rejected':
      return { headline: 'Order Rejected by Restaurant', eta: 'Closed' };
    case 'cancelled':
    case 'refund_pending':
    case 'refunded':
      return { headline: 'Order Cancelled', eta: 'Closed' };
    default:
      return { headline: 'Tracking Your Order', eta: 'Live' };
  }
}

export default function LiveOrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();

  const { data, isLoading, isError, error, refetch } = useQuery<TrackingOrderResponse>({
    queryKey: ['customer', 'order-tracking', id],
    enabled: Boolean(id),
    refetchInterval: 6000,
    queryFn: () => httpClient.get<TrackingOrderResponse>(`/orders/${id}`),
  });

  // Also subscribe to live Socket.IO order status updates for instant transitions
  useEffect(() => {
    if (!id) return;
    let active = true;
    const socketBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    let socketInstance: ReturnType<typeof io> | null = null;

    void Promise.resolve(tokenStorage.getAccessToken()).then((token) => {
      if (!active || !token) return;
      socketInstance = io(socketBase, {
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socketInstance.emit('order:join', { orderId: id });
      socketInstance.on('order:status_changed', () => {
        playAlertChime('order_update');
        void refetch();
      });
      socketInstance.on('rider:location_updated', () => {
        void refetch();
      });
    });

    return () => {
      active = false;
      socketInstance?.disconnect();
    };
  }, [id, refetch]);

  // Play chime when order transitions to on_the_way or delivered
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = data?.order?.status;
    if (cur && prevStatusRef.current && prevStatusRef.current !== cur) {
      if (['on_the_way', 'delivered', 'picked_up'].includes(cur)) {
        playAlertChime('order_update');
      }
    }
    if (cur) prevStatusRef.current = cur;
  }, [data?.order?.status]);

  const order = data?.order;
  const items = data?.items ?? [];
  const history = data?.history ?? [];
  const status = order?.status ?? 'pending';
  const stepIdx = getProgressStep(status);
  const hero = getHeroCopy(status);
  const meta = ORDER_STATUS_META[status] ?? {
    labelEn: String(status).replace(/_/g, ' ').toUpperCase(),
    tone: 'info' as const,
  };
  const isTerminalNegative = ['rejected', 'cancelled', 'refund_pending', 'refunded'].includes(status);
  const progressPct = stepIdx >= 0 ? Math.round(((stepIdx + 1) / TIMELINE_STEPS.length) * 100) : 0;

  const historyTimeByStatus = new Map<string, string>();
  for (const h of history) {
    historyTimeByStatus.set(h.toStatus, new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  const StageIcon =
    isTerminalNegative
      ? XCircle
      : status === 'delivered'
        ? PackageCheck
        : status === 'on_the_way' || status === 'picked_up'
          ? Truck
          : ChefHat;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Live Order Tracking"
        subtitle={order ? order.orderNumber : 'Syncing live status...'}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          <IconButton
            icon={<RefreshCw size={18} color={colors.textPrimary} />}
            accessibilityLabel="Refresh"
            onPress={() => void refetch()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading && !order ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Loading live order status...</Text>
          </View>
        ) : !order ? (
          <ErrorState
            message={
              isError && error instanceof Error
                ? error.message
                : 'Could not load live tracking for this order.'
            }
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            {/* Hero Live Status Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: isTerminalNegative ? '#FEE2E2' : colors.surface,
                  borderColor: isTerminalNegative ? '#EF4444' : colors.primary,
                  borderRadius: radii.xl,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.livePill}>
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: isTerminalNegative ? '#DC2626' : '#16A34A' },
                    ]}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isTerminalNegative ? '#991B1B' : '#15803D',
                    }}
                  >
                    {status === 'delivered' ? 'COMPLETED' : isTerminalNegative ? 'CLOSED' : 'LIVE UPDATES'}
                  </Text>
                </View>
                <StatusBadge label={meta.labelEn} tone={meta.tone} />
              </View>

              <View style={styles.heroRow}>
                <View
                  style={[
                    styles.heroIconWrap,
                    { backgroundColor: isTerminalNegative ? '#FECACA' : colors.primarySoft },
                  ]}
                >
                  <StageIcon size={30} color={isTerminalNegative ? '#DC2626' : colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{hero.headline}</Text>
                  <View style={styles.row}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                      ETA: {hero.eta} · {order.orderNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {!isTerminalNegative ? (
                <View style={{ gap: 6 }}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: `${progressPct}%` },
                      ]}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'right' }}>
                    {progressPct}% complete
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Delivery OTP Card — Customer Reads This 4-Digit Code to the Rider */}
            {order.deliveryOtp && status !== 'delivered' && !isTerminalNegative ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    borderRadius: radii.xl,
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1 }}>
                  DELIVERY CONFIRMATION OTP
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '900',
                    letterSpacing: 10,
                    color: colors.textPrimary,
                    marginVertical: 4,
                  }}
                >
                  {order.deliveryOtp}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                  Share this 4-digit code with your Rider when your order arrives to confirm delivery.
                </Text>
              </View>
            ) : null}

            {/* Live GPS Delivery Map & Assigned Rider Card */}
            {data?.delivery && !isTerminalNegative ? (
              <LiveTrackingMap delivery={data.delivery} />
            ) : null}

            {/* Vertical Step-by-Step Live Timeline */}
            {!isTerminalNegative ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Live Order Progress
                </Text>
                {TIMELINE_STEPS.map((step, idx) => {
                  const done = idx < stepIdx || status === 'delivered';
                  const active = idx === stepIdx && status !== 'delivered';
                  const ts = historyTimeByStatus.get(step.key);
                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        {done ? (
                          <CheckCircle2 size={20} color="#16A34A" />
                        ) : active ? (
                          <CheckCircle2 size={20} color={colors.primary} />
                        ) : (
                          <Circle size={20} color={colors.border} />
                        )}
                        {idx < TIMELINE_STEPS.length - 1 ? (
                          <View
                            style={[
                              styles.timelineLine,
                              { backgroundColor: done ? '#16A34A' : colors.border },
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={styles.timelineBody}>
                        <View style={styles.rowBetween}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: done || active ? '700' : '500',
                              color: active
                                ? colors.primary
                                : done
                                  ? colors.textPrimary
                                  : colors.textSecondary,
                            }}
                          >
                            {step.label}
                          </Text>
                          {ts ? (
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{ts}</Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Delivery Address & Items */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Delivery &amp; Order Summary
              </Text>
              {order.deliveryAddressSnapshot ? (
                <View style={styles.row}>
                  <MapPin size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                    {[
                      order.deliveryAddressSnapshot.houseNumber,
                      order.deliveryAddressSnapshot.street,
                      order.deliveryAddressSnapshot.area,
                      order.deliveryAddressSnapshot.city,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {items.map((item) => (
                <View key={item._id} style={styles.rowBetween}>
                  <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                    {item.quantity}× {item.nameSnapshot}
                    {item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ''}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                    {formatMoney(item.lineTotalMinor)}
                  </Text>
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.rowBetween}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                  Total ({order.paymentMethod.toUpperCase()})
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                  {formatMoney(order.totalMinor)}
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="View Receipt & Download PDF Invoice"
              leftIcon={<FileText size={16} color="#FFFFFF" />}
              fullWidth
              onPress={() => router.push(`/order/${order._id}`)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },
  centerBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  heroCard: { padding: 18, borderWidth: 1.5, gap: 14 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 9999 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconWrap: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 9999 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: 1, marginVertical: 4 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 22 },
  timelineLine: { width: 2, flex: 1, minHeight: 22, marginVertical: 3 },
  timelineBody: { flex: 1, paddingBottom: 14, gap: 2 },
});
