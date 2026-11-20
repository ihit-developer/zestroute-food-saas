import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Bike, Sparkles, User, X } from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton, SecondaryButton, ZestRouteLogo, useToast } from '../../components/ui';
import { authApi, tokenStorage } from '../../services/apiClient';
import {
  getSavedAccounts,
  removeSavedAccount,
  saveAccount,
  type SavedAccount,
} from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, radii, strings } = useTheme();
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
      <View style={styles.hero}>
        <ZestRouteLogo size={54} />
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          Delicious meals from local kitchens, right to your door.
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {strings.brandTagline} · Sign in once and switch between your saved accounts with 1 tap.
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Saved Accounts (Appears automatically after user logs in once!) */}
        {savedAccounts.length > 0 ? (
          <View
            style={[
              styles.savedBox,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
            ]}
          >
            <View style={styles.savedHeader}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                SAVED ACCOUNTS · TAP TO CONTINUE
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

        <PrimaryButton
          title={savedAccounts.length > 0 ? 'Sign In with Another Account' : 'Sign In (Customer / Rider)'}
          fullWidth
          onPress={() => router.push('/(auth)/login')}
        />
        <SecondaryButton
          title="Create Account (Customer / Rider)"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'space-between' },
  hero: { marginTop: 36, gap: 14 },
  heading: { fontSize: 28, fontWeight: '800', lineHeight: 36, marginTop: 8 },
  sub: { fontSize: 15, lineHeight: 22 },
  actions: { gap: 12, paddingBottom: 12 },
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
});
