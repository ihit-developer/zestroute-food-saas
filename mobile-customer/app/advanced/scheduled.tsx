import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarClock } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState, IconButton, PrimaryButton, Tabs, TopNav, useToast } from '../../components/ui';

export default function ScheduledOrdersScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'once' | 'recurring'>('once');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Scheduled & Recurring"
        subtitle="Plan meals ahead with confirmation"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Tabs
          items={[
            { key: 'once', label: 'Scheduled Once' },
            { key: 'recurring', label: 'Recurring Meals' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as 'once' | 'recurring')}
        />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <CalendarClock size={18} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              Explicit Confirmation Policy
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Recurring paid orders always prompt for confirmation before charging your payment method.
          </Text>
        </View>

        <EmptyState
          title={`No ${tab} orders scheduled`}
          description="Schedule a lunch or dinner delivery for a future date and time."
          actionLabel="Schedule New Order"
          onAction={() => showToast('Select items from a restaurant to schedule', 'info')}
        />
        <PrimaryButton title="Browse Restaurants" fullWidth onPress={() => router.push('/(tabs)/explore')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
