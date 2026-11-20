import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert } from 'lucide-react-native';
import { APPROVAL_STATUS_META } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton, SecondaryButton, StatusBadge } from '../../components/ui/RiderUI';
import { useRiderStore } from '../../store/useRiderStore';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const approvalStatus = useRiderStore((s) => s.approvalStatus);
  const meta = APPROVAL_STATUS_META[approvalStatus];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
          <ShieldAlert size={34} color={colors.primary} />
        </View>
        <StatusBadge label={meta.labelEn} tone={meta.tone} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Rider Verification Required
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          Only admin-approved riders can receive delivery assignments. Our team is reviewing your CNIC, driving license, and vehicle documents.
        </Text>
        <PrimaryButton
          title="Check Status"
          fullWidth
          onPress={() => router.replace('/(tabs)/dashboard')}
        />
        <SecondaryButton
          title="Back to Sign In"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'center' },
  card: { padding: 24, borderWidth: 1, alignItems: 'center', gap: 14 },
  iconCircle: { width: 72, height: 72, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
