import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../components/ui/RiderUI';
import { useDeliveryRequests } from '../../hooks/useRiderData';

export default function DeliveryRequestsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useDeliveryRequests();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav title="Delivery Requests" subtitle="Incoming dispatch offers" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <LoadingSkeleton height={140} />
        ) : isError ? (
          <ErrorState message="Could not load delivery requests." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No incoming delivery requests"
            description="Stay online to receive live restaurant pickup offers. Atomic assignment prevents duplicate acceptance."
          />
        ) : (
          data.map((req) => (
            <View
              key={req.assignmentId}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  {req.restaurantName}
                </Text>
                <StatusBadge label={`${req.distanceKm.toFixed(1)} km`} tone="info" />
              </View>
              <View style={styles.row}>
                <MapPin size={14} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Pickup: {req.pickupLocation}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Dropoff Area: {req.dropoffArea}
              </Text>
              {req.instructions && (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Note: {req.instructions}
                </Text>
              )}
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>
                Est. Earning: {formatMoney(req.estimatedEarningMinor)}
              </Text>
              <View style={styles.actions}>
                <SecondaryButton
                  title="Reject"
                  onPress={() => showToast('Offer rejected')}
                />
                <PrimaryButton
                  title="Accept Delivery"
                  onPress={() => router.push(`/delivery/${req.deliveryId}/pickup`)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
