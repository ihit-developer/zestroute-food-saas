import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge, TopNav } from '../../components/ui/RiderUI';
import { useRiderHistory } from '../../hooks/useRiderData';

export default function RiderHistoryScreen() {
  const { colors, radii } = useTheme();
  const { data, isLoading, isError, refetch } = useRiderHistory();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav title="Delivery History" subtitle="Completed & cancelled trips" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <LoadingSkeleton height={110} />
        ) : isError ? (
          <ErrorState message="Unable to load delivery history." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No completed deliveries yet"
            description="Your completed deliveries, tips, and timestamps will be listed here."
          />
        ) : (
          data.map((item) => (
            <View
              key={item.deliveryId}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{item.orderNumber}</Text>
                <StatusBadge
                  label={item.status}
                  tone={item.status === 'delivered' ? 'success' : 'error'}
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {item.restaurantName} • {item.area}
              </Text>
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {formatMoney(item.earningMinor + item.tipMinor)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  card: { padding: 14, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
