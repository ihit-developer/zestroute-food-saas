import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Users } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { EmptyState, IconButton, PrimaryButton, TopNav, useToast } from '../../../components/ui';

export default function GroupOrderScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Group Order"
        subtitle={`Invite Code: ${code ?? 'NEW'}`}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          <IconButton
            icon={<Share2 size={18} color={colors.primary} />}
            accessibilityLabel="Share invite"
            onPress={() => showToast('Invite link copied to share', 'success')}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <Users size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              Shared Group Cart
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Invite friends to add their own food items before confirming the group checkout.
          </Text>
        </View>

        <EmptyState
          title="No group members yet"
          description="Share the invite code so friends can join and add items to this group cart."
        />

        <PrimaryButton
          title="Confirm Group Order"
          fullWidth
          onPress={() => router.push('/checkout')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
