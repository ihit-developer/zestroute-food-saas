import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../components/ui';
import { useNotifications } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useNotifications();
  const unreadCount = data.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await httpClient.patch('/notifications/read-all', {});
      await queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
      showToast('All notifications marked as read', 'success');
    } catch {
      showToast('Unable to mark notifications read', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          unreadCount > 0 ? (
            <IconButton
              icon={<CheckCheck size={18} color={colors.primary} />}
              accessibilityLabel="Mark all read"
              onPress={() => void handleMarkAllRead()}
            />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingSkeleton height={90} />
        ) : isError ? (
          <ErrorState message="Could not load notifications." onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="Real-time order updates, review replies, and refund alerts will appear here."
          />
        ) : (
          data.map((n, idx) => (
            <Pressable
              key={n.id || String(idx)}
              onPress={() => {
                if (n.data?.orderId) {
                  router.push(`/order/tracking/${n.data.orderId}`);
                }
              }}
              style={[
                styles.card,
                {
                  backgroundColor: n.isRead ? colors.surface : colors.primarySoft,
                  borderColor: n.isRead ? colors.border : colors.primary,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Bell size={15} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
                    {n.title}
                  </Text>
                </View>
                {!n.isRead ? <StatusBadge label="New" tone="primary" /> : null}
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{n.body}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { padding: 14, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
