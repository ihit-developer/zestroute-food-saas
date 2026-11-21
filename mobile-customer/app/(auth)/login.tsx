import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Bike, Eye, EyeOff, Lock, Mail, Sparkles, User, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, useToast } from '../../components/ui';
import { loginSchema } from '../../features/validation/authSchemas';
import { authApi, tokenStorage } from '../../services/apiClient';
import {
  getSavedAccounts,
  removeSavedAccount,
  saveAccount,
  type SavedAccount,
} from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';
import { ApiClientError } from '@zestroute/shared';

type LoginForm = { identifier: string; password: string };

export default function LoginScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);

  const [selectedRole, setSelectedRole] = useState<'customer' | 'rider'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [signingInSaved, setSigningInSaved] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    void getSavedAccounts().then(setSavedAccounts);
  }, []);

  const performLogin = async (data: LoginForm, shouldRemember: boolean) => {
    try {
      const res = await authApi.login(data);
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);
      const isRiderAccount = res.user.roles.includes('rider');
      const isCustomerAccount = res.user.roles.includes('customer');
      const goToRider =
        selectedRole === 'rider'
          ? isRiderAccount
          : isRiderAccount && !isCustomerAccount;

      if (selectedRole === 'rider' && !isRiderAccount) {
        await tokenStorage.clearTokens();
        showToast('This account is not a Rider account. Switch to Customer above.', 'error');
        return;
      }

      if (shouldRemember) {
        const nextSaved = await saveAccount({
          identifier: data.identifier,
          password: data.password,
          fullName: res.user.fullName,
          role: goToRider ? 'rider' : 'customer',
        });
        setSavedAccounts(nextSaved);
      }

      setSession({
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email ?? '',
        phone: res.user.phone ?? '',
      });
      showToast(`Signed in as ${goToRider ? 'Rider' : 'Customer'}`, 'success');
      if (goToRider) {
        router.replace('/(rider)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to reach authentication server';
      showToast(msg, 'error');
    }
  };

  const onSubmit = async (data: LoginForm) => {
    await performLogin(data, rememberMe);
  };

  const handleTapSaved = async (acct: SavedAccount) => {
    setSigningInSaved(acct.identifier);
    setValue('identifier', acct.identifier);
    setValue('password', acct.password);
    try {
      await performLogin({ identifier: acct.identifier, password: acct.password }, true);
    } finally {
      setSigningInSaved(null);
    }
  };

  const handleForget = async (identifier: string) => {
    const next = await removeSavedAccount(identifier);
    setSavedAccounts(next);
    showToast('Account removed from saved list', 'info');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <IconButton
          icon={<ArrowLeft size={20} color={colors.textPrimary} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Sign In to Dastarkhwan</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Choose your role first, then sign in once for 1-tap access next time.
          </Text>
        </View>

        {/* Step 1: Choose Role First (Customer vs Rider) */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
            1. CHOOSE YOUR ROLE
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setSelectedRole('customer')}
              style={[
                styles.roleCard,
                {
                  backgroundColor: selectedRole === 'customer' ? colors.primarySoft : colors.surface,
                  borderColor: selectedRole === 'customer' ? colors.primary : colors.border,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <User size={20} color={selectedRole === 'customer' ? colors.primary : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: selectedRole === 'customer' ? colors.primary : colors.textPrimary,
                }}
              >
                Customer
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Order &amp; Track Food</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedRole('rider')}
              style={[
                styles.roleCard,
                {
                  backgroundColor: selectedRole === 'rider' ? 'rgba(22,163,74,0.12)' : colors.surface,
                  borderColor: selectedRole === 'rider' ? '#16A34A' : colors.border,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <Bike size={20} color={selectedRole === 'rider' ? '#16A34A' : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: selectedRole === 'rider' ? '#16A34A' : colors.textPrimary,
                }}
              >
                Rider
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Deliver &amp; Earn</Text>
            </Pressable>
          </View>
        </View>

        {/* Saved Accounts Filtered for Selected Role */}
        {savedAccounts.filter((a) => a.role === selectedRole).length > 0 ? (
          <View
            style={[
              styles.savedBox,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
            ]}
          >
            <View style={styles.savedHeader}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                SAVED {selectedRole.toUpperCase()} ACCOUNTS · 1-TAP SIGN IN
              </Text>
            </View>
            {savedAccounts
              .filter((a) => a.role === selectedRole)
              .map((acct) => {
              const busy = signingInSaved === acct.identifier;
              const isRider = acct.role === 'rider';
              return (
                <Pressable
                  key={acct.identifier}
                  disabled={signingInSaved !== null || isSubmitting}
                  onPress={() => void handleTapSaved(acct)}
                  style={[
                    styles.savedRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
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
                      <Bike size={17} color="#16A34A" />
                    ) : (
                      <User size={17} color={colors.primary} />
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
                      void handleForget(acct.identifier);
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

        <View style={styles.form}>
          <Controller
            control={control}
            name="identifier"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Email or Phone Number"
                placeholder="you@example.com or 03001234567"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.identifier?.message}
                leftIcon={<Mail size={18} color={colors.textSecondary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
                rightElement={
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <View style={styles.rememberRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                Remember for 1-tap login
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                Forgot?
              </Text>
            </Pressable>
          </View>

          <PrimaryButton
            title="Sign In"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 20 },
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 14, lineHeight: 20 },
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  form: { gap: 16 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
});
