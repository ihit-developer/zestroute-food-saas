import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Trash2 } from 'lucide-react-native';
import { ApiClientError, ORDER_STATUS_META, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { useCustomerOrders, type OrderSummaryItem } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const addToCart = useAppStore((s) => s.addToCart);
  const clearCart = useAppStore((s) => s.clearCart);
  const setActiveRestaurant = useAppStore((s) => s.setActiveRestaurant);
  const [tab, setTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [deleteTarget, setDeleteTarget] = useState<OrderSummaryItem | null>(null);
  const { data, isLoading, isError, refetch } = useCustomerOrders(tab);

  const handleReorder = (order: OrderSummaryItem) => {
    const itemsToAdd = order.reorderItems ?? [];
    if (itemsToAdd.length === 0) {
      router.push(`/restaurant/${order.restaurantId}`);
      return;
    }
    clearCart();
    setActiveRestaurant({ id: order.restaurantId, name: order.restaurantName });
    for (const item of itemsToAdd) {
      addToCart(order.restaurantId, order.restaurantName, {
        id: `${item.foodId}-reorder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        foodId: item.foodId,
        name: item.name,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        customizations: [],
      });
    }
    showToast(`Added ${itemsToAdd.length} item(s) from ${order.restaurantName} to cart!`, 'success');
    router.push('/cart');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await httpClient.del(`/orders/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ['customer', 'orders'] });
      showToast(`Order ${deleteTarget.orderNumber} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to delete order', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="My Orders"
        subtitle="Track live orders & order history"
        rightAction={
          <IconButton
            icon={<RefreshCw size={18} color={colors.textPrimary} />}
            accessibilityLabel="Refresh orders"
            onPress={() => void refetch()}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Tabs
          items={[
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as 'active' | 'completed' | 'cancelled')}
        />

        {!isAuthenticated ? (
          <EmptyState
            title="Sign in to view your orders"
            description="Sign in or create an account to place orders and track live deliveries."
            actionLabel="Sign In"
            onAction={() => router.push('/(auth)/login')}
          />
        ) : isLoading ? (
          <LoadingSkeleton height={130} />
        ) : isError ? (
          <ErrorState message="Unable to fetch your orders." onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title={`No ${tab} orders`}
            description="Your orders will appear here as soon as you place an order from any restaurant."
            actionLabel="Browse Food Menu"
            onAction={() => router.push('/(tabs)/home')}
          />
        ) : (
          data.map((order) => {
            const meta = ORDER_STATUS_META[order.status] ?? {
              labelEn: String(order.status).replace(/_/g, ' ').toUpperCase(),
              tone: 'info' as const,
            };
            return (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[styles.orderNum, { color: colors.textPrimary }]}>
                      {order.orderNumber}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                    </Text>
                  </View>
                  <StatusBadge label={meta.labelEn} tone={meta.tone} />
                </View>

                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  {order.restaurantName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={2}>
                  {order.itemsSummary || 'Fresh order items'}
                </Text>

                {tab === 'active' && order.deliveryOtp ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                      borderWidth: 1,
                      borderRadius: radii.md,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                      Delivery OTP (Give to Rider)
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '900',
                        letterSpacing: 4,
                        color: colors.primary,
                      }}
                    >
                      {order.deliveryOtp}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.rowBetween, { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                    {formatMoney(order.totalMinor)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <IconButton
                      icon={<Trash2 size={16} color={colors.error} />}
                      accessibilityLabel="Delete order"
                      onPress={() => setDeleteTarget(order)}
                    />
                    <SecondaryButton
                      title="Details"
                      onPress={() => router.push(`/order/${order.id}`)}
                    />
                    {tab === 'active' ? (
                      <PrimaryButton
                        title="Track Live"
                        onPress={() => router.push(`/order/tracking/${order.id}`)}
                      />
                    ) : (
                      <PrimaryButton
                        title="Reorder"
                        leftIcon={<RotateCcw size={14} color="#FFFFFF" />}
                        onPress={() => handleReorder(order)}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmationDialog
        visible={Boolean(deleteTarget)}
        title="Delete Order?"
        message={`Are you sure you want to permanently delete order ${deleteTarget?.orderNumber ?? ''}?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderNum: { fontSize: 14, fontWeight: '800' },
});
