import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, Gift, RefreshCw, Wallet } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState, IconButton, PrimaryButton, StatusBadge, TopNav, useToast } from '../../components/ui';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

interface WalletPayload {
  wallet?: { balanceMinor: number; currency: string };
  transactions?: Array<{
    _id: string;
    type: 'credit' | 'debit';
    source: string;
    amountMinor: number;
    createdAt: string;
  }>;
}

export default function WalletAndLoyaltyScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const isAuth = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);

  const { data, isLoading, refetch } = useQuery<WalletPayload>({
    queryKey: ['customer', 'wallet'],
    enabled: isAuth,
    refetchInterval: 8000,
    queryFn: () => httpClient.get<WalletPayload>('/wallet'),
  });

  const balanceMinor = data?.wallet?.balanceMinor ?? 0;
  const transactions = data?.transactions ?? [];
  const referralCode = user?.id ? `ZR-${user.id.slice(-6).toUpperCase()}` : 'Sign in to unlock';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Wallet & Loyalty"
        subtitle="Live balance, refund credits & transactions"
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
        <View style={[styles.balanceCard, { backgroundColor: colors.primary, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <Wallet size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFF0E3', fontSize: 13, fontWeight: '600' }}>Wallet Balance</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '700' }}>
              {formatMoney(balanceMinor)}
            </Text>
          )}
          <Text style={{ color: '#FFF0E3', fontSize: 12 }}>
            Approved refunds and promotional credits appear here automatically.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Award size={20} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                Pay with Wallet at Checkout
              </Text>
            </View>
            <PrimaryButton
              title="Order Food"
              onPress={() => {
                showToast('Select ZestRoute Wallet at Checkout to spend balance', 'info');
                router.push('/(tabs)/home');
              }}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <Gift size={20} color={colors.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
              Personal Referral Code
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{referralCode}</Text>
        </View>

        {transactions.length === 0 ? (
          <EmptyState
            title="No wallet transactions yet"
            description="Refund credits and wallet order payments will appear here in real time."
          />
        ) : (
          transactions.map((tx) => (
            <View
              key={tx._id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  {tx.source.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <StatusBadge
                  label={`${tx.type === 'credit' ? '+' : '-'}${formatMoney(tx.amountMinor)}`}
                  tone={tx.type === 'credit' ? 'success' : 'warning'}
                />
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
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
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  balanceCard: { padding: 20, gap: 8 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
