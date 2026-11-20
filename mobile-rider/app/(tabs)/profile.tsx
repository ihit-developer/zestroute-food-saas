import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, ShieldCheck, User } from 'lucide-react-native';
import { APPROVAL_STATUS_META } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { SecondaryButton, StatusBadge, TopNav } from '../../components/ui/RiderUI';
import { useRiderStore } from '../../store/useRiderStore';
import { riderAuthApi, riderTokenStorage } from '../../services/apiClient';

export default function RiderProfileScreen() {
  const router = useRouter();
  const { mode, toggleMode, locale, setLocale, colors, radii } = useTheme();
  const { riderProfile, approvalStatus, logout } = useRiderStore();
  const meta = APPROVAL_STATUS_META[approvalStatus];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav title="Rider Profile" subtitle="Vehicle, documents & settings" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <User size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>
                {riderProfile?.fullName ?? 'Rider Partner'}
              </Text>
              <StatusBadge label={`Verification: ${meta.labelEn}`} tone={meta.tone} />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Vehicle: {riderProfile?.vehicleType ?? 'Not set'} • {riderProfile?.vehicleNumber ?? '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Dark Mode</Text>
            <Switch value={mode === 'dark'} onValueChange={toggleMode} trackColor={{ true: colors.primary }} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Urdu (RTL)</Text>
            <Switch
              value={locale === 'ur'}
              onValueChange={(v) => setLocale(v ? 'ur' : 'en')}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>

        <SecondaryButton
          title="Log Out"
          leftIcon={<LogOut size={18} color={colors.error} />}
          onPress={async () => {
            const refresh = await riderTokenStorage.getRefreshToken();
            if (refresh) {
              await riderAuthApi.logout(refresh).catch(() => {});
            }
            await riderTokenStorage.clearTokens();
            logout();
            router.replace('/(auth)/login');
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 52, height: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
});
