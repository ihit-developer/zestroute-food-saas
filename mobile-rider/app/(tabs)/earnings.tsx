import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge, Tabs, TopNav } from '../../components/ui/RiderUI';
import { useRiderEarnings } from '../../hooks/useRiderData';

export default function RiderEarningsScreen() {
  const { colors, radii } = useTheme();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data, isLoading, isError, refetch } = useRiderEarnings(period);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav title="Earnings & Payouts" subtitle="Delivery fees, bonuses & tips" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Tabs
          items={[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ]}
          activeKey={period}
          onChange={(k) => setPeriod(k as 'daily' | 'weekly' | 'monthly')}
        />

        {isLoading ? (
          <LoadingSkeleton height={150} />
        ) : isError ? (
          <ErrorState message="Could not load earnings." onRetry={() => refetch()} />
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: colors.primary, borderRadius: radii.lg }]}>
              <Text style={{ color: '#FFF0E3', fontSize: 13, fontWeight: '600' }}>Total Earnings</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '700' }}>
                {formatMoney(data.totalMinor)}
              </Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.subVal}>Fees: {formatMoney(data.deliveryFeesMinor)}</Text>
                <Text style={styles.subVal}>Bonuses: {formatMoney(data.bonusesMinor)}</Text>
                <Text style={styles.subVal}>Tips: {formatMoney(data.tipsMinor)}</Text>
              </View>
            </View>

            {data.payouts.length === 0 ? (
              <EmptyState
                title="No payout records yet"
                description="Completed delivery payouts and settlement statuses will appear here."
              />
            ) : (
              data.payouts.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{p.period}</Text>
                    <StatusBadge label={p.status} tone="info" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
                    {formatMoney(p.amountMinor)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  hero: { padding: 20, gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  subVal: { color: '#FFF0E3', fontSize: 12, fontWeight: '600' },
  card: { padding: 14, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
