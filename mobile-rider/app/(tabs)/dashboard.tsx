import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bike, Navigation, Star } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  StatusBadge,
  TopNav,
} from '../../components/ui/RiderUI';
import { useRiderDashboard } from '../../hooks/useRiderData';
import { useRiderStore } from '../../store/useRiderStore';

export default function RiderDashboardScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { isOnline, setOnline, activeDeliveryId } = useRiderStore();
  const { data, isLoading, isError, refetch } = useRiderDashboard();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Rider Dashboard"
        subtitle={isOnline ? 'Online & receiving requests' : 'Offline'}
        rightAction={<StatusBadge label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'success' : 'neutral'} />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Online / Offline Toggle Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Bike size={20} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  Availability Status
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Toggle online to receive nearby delivery offers
                </Text>
              </View>
            </View>
            <Switch value={isOnline} onValueChange={setOnline} trackColor={{ true: colors.success }} />
          </View>
        </View>

        {/* Active Delivery Banner */}
        {activeDeliveryId ? (
          <View style={[styles.card, { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.lg }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              Active Delivery In Progress
            </Text>
            <PrimaryButton
              title="Open Active Delivery"
              leftIcon={<Navigation size={16} color="#FFFFFF" />}
              onPress={() => router.push(`/delivery/${activeDeliveryId}/pickup`)}
            />
          </View>
        ) : (
          <EmptyState
            title="No active delivery"
            description="When you accept a delivery request, pickup and customer dropoff navigation will appear here."
            actionLabel="Check Requests"
            onAction={() => router.push('/(tabs)/requests')}
          />
        )}

        {/* KPIs */}
        {isLoading ? (
          <LoadingSkeleton height={130} />
        ) : isError ? (
          <ErrorState message="Could not load rider stats." onRetry={() => refetch()} />
        ) : (
          <View style={styles.grid}>
            {[
              { label: "Today's Deliveries", val: String(data.todayDeliveries) },
              { label: 'Completed Total', val: String(data.completedDeliveries) },
              { label: "Today's Earnings", val: formatMoney(data.todayEarningsMinor) },
              { label: 'Weekly Earnings', val: formatMoney(data.weeklyEarningsMinor) },
              { label: 'Monthly Earnings', val: formatMoney(data.monthlyEarningsMinor) },
              { label: 'Average Rating', val: data.ratingAvg > 0 ? data.ratingAvg.toFixed(1) : '—', star: true },
            ].map((kpi) => (
              <View
                key={kpi.label}
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{kpi.label}</Text>
                <View style={styles.row}>
                  {kpi.star && <Star size={16} color={colors.accent} fill={colors.accent} />}
                  <Text style={{ fontSize: 19, fontWeight: '700', color: colors.textPrimary }}>{kpi.val}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { width: '48%', padding: 14, borderWidth: 1, gap: 6 },
});
