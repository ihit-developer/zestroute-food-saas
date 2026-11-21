import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Bike,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton, SecondaryButton, useToast } from '../../components/ui';
import { authApi, tokenStorage } from '../../services/apiClient';
import {
  getSavedAccounts,
  removeSavedAccount,
  saveAccount,
  type SavedAccount,
} from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';

const APP_LOGO = require('../../assets/icon.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [signingInId, setSigningInId] = useState<string | null>(null);

  useEffect(() => {
    void getSavedAccounts().then(setSavedAccounts);
  }, []);

  const handleTapSavedAccount = async (acct: SavedAccount) => {
    setSigningInId(acct.identifier);
    try {
      const res = await authApi.login({
        identifier: acct.identifier,
        password: acct.password,
      });
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);
      const isRiderOnly =
        res.user.roles.includes('rider') && !res.user.roles.includes('customer');
      await saveAccount({
        identifier: acct.identifier,
        password: acct.password,
        fullName: res.user.fullName,
        role: isRiderOnly ? 'rider' : 'customer',
      });
      setSession({
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email ?? '',
        phone: res.user.phone ?? '',
      });
      showToast(`Welcome back, ${res.user.fullName}!`, 'success');
      router.replace(isRiderOnly ? '/(rider)/dashboard' : '/(tabs)/home');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to sign in with saved account';
      showToast(msg, 'error');
    } finally {
      setSigningInId(null);
    }
  };

  const handleForgetAccount = async (identifier: string) => {
    const next = await removeSavedAccount(identifier);
    setSavedAccounts(next);
    showToast('Saved account removed', 'info');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Executive Brand Hero Card */}
        <View style={[styles.heroCard, { borderRadius: radii.xl }]}>
          <View style={styles.brandRow}>
            <Image source={APP_LOGO} style={styles.logoImg} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>
                Dastar<Text style={{ color: '#FDBA74' }}>khwan</Text>
              </Text>
              <Text style={styles.brandSub}>Multi-Restaurant Food Delivery</Text>
            </View>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <Text style={styles.heroHeadline}>
            Fresh food from top kitchens, tracked live to your door.
          </Text>

          <View style={styles.featureGrid}>
            {[
              { icon: Store, label: 'Top Kitchens' },
              { icon: MapPin, label: 'Live GPS Map' },
              { icon: ShieldCheck, label: 'OTP Verified' },
            ].map((f) => {
              const IconComp = f.icon;
              return (
                <View key={f.label} style={styles.featurePill}>
                  <IconComp size={14} color="#FDBA74" />
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Saved Accounts (Appears automatically after user logs in once) */}
        {savedAccounts.length > 0 ? (
          <View
            style={[
              styles.savedBox,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
            ]}
          >
            <View style={styles.savedHeader}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.4 }}>
                SAVED ACCOUNTS · 1-TAP CONTINUE
              </Text>
            </View>
            {savedAccounts.map((acct) => {
              const busy = signingInId === acct.identifier;
              const isRider = acct.role === 'rider';
              return (
                <Pressable
                  key={acct.identifier}
                  disabled={signingInId !== null}
                  onPress={() => void handleTapSavedAccount(acct)}
                  style={[
                    styles.savedRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                      opacity: signingInId && !busy ? 0.55 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      { backgroundColor: isRider ? 'rgba(22,163,74,0.14)' : colors.primarySoft },
                    ]}
                  >
                    {isRider ? (
                      <Bike size={18} color="#16A34A" />
                    ) : (
                      <User size={18} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                      {busy ? 'Signing in...' : acct.fullName}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textSecondary }} numberOfLines={1}>
                      {isRider ? 'Rider' : 'Customer'} · {acct.identifier}
                    </Text>
                  </View>
                  <ArrowRight size={16} color={colors.primary} />
                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      void handleForgetAccount(acct.identifier);
                    }}
                    style={{ padding: 4 }}
                  >
                    <X size={15} color={colors.textSecondary} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <PrimaryButton
            title={savedAccounts.length > 0 ? 'Sign In with Another Account' : 'Sign In (Customer / Rider)'}
            fullWidth
            onPress={() => router.push('/(auth)/login')}
          />
          <SecondaryButton
            title="Create New Account"
            fullWidth
            onPress={() => router.push('/(auth)/register')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'space-between', gap: 18 },
  heroCard: {
    backgroundColor: '#0F172A',
    padding: 22,
    gap: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImg: { width: 58, height: 58, borderRadius: 16 },
  brandTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4 },
  brandSub: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22,163,74,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#4ADE80' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#4ADE80', letterSpacing: 0.5 },
  heroHeadline: {
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 33,
    color: '#FFFFFF',
  },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featureText: { fontSize: 11.5, fontWeight: '700', color: '#E2E8F0' },
  savedBox: { padding: 14, borderWidth: 1, gap: 10 },
  savedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: 12, paddingBottom: 8 },
});
