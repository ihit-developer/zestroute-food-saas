import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, useToast } from '../../components/ui';
import { loginSchema } from '../../features/validation/authSchemas';
import { authApi, tokenStorage } from '../../services/apiClient';
import {
  getSavedAccounts,
  removeSavedAccount,
  saveAccount,
  type SavedAccount,
  type SavedAccountRole,
} from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';
import { ApiClientError } from '@zestroute/shared';

type LoginForm = { identifier: string; password: string };

const ROLE_OPTIONS: Array<{
  key: SavedAccountRole;
  label: string;
  sub: string;
  color: string;
  bg: string;
  Icon: typeof User;
}> = [
  { key: 'customer', label: 'Customer', sub: 'Order & Track', color: '#F47B20', bg: 'rgba(244,123,32,0.12)', Icon: User },
  { key: 'rider', label: 'Rider', sub: 'Deliver & Earn', color: '#16A34A', bg: 'rgba(22,163,74,0.12)', Icon: Bike },
  { key: 'vendor', label: 'Restaurant', sub: 'Kitchen & Plans', color: '#2563EB', bg: 'rgba(37,99,235,0.12)', Icon: Store },
  { key: 'admin', label: 'Super Admin', sub: 'SaaS Control', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', Icon: Crown },
];

export default function LoginScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);

  const [selectedRole, setSelectedRole] = useState<SavedAccountRole>('customer');
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

  const performLogin = async (data: LoginForm, shouldRemember: boolean, roleOverride?: SavedAccountRole) => {
    const activeRole = roleOverride ?? selectedRole;
    try {
      const res = await authApi.login(data);
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);
      const roles = res.user.roles;

      const isAdmin = roles.includes('super_admin');
      const isVendor = roles.includes('restaurant_owner') || roles.includes('restaurant_staff') || isAdmin;
      const isRider = roles.includes('rider');
      const isCustomer = roles.includes('customer');

      if (activeRole === 'admin' && !isAdmin) {
        await tokenStorage.clearTokens();
        showToast('This account is not a Super Admin account.', 'error');
        return;
      }
      if (activeRole === 'vendor' && !isVendor) {
        await tokenStorage.clearTokens();
        showToast('This account is not a Restaurant Vendor account.', 'error');
        return;
      }
      if (activeRole === 'rider' && !isRider) {
        await tokenStorage.clearTokens();
        showToast('This account is not a Rider account.', 'error');
        return;
      }

      let resolvedRole: SavedAccountRole = activeRole;
      if (activeRole === 'customer' && !isCustomer) {
        if (isAdmin) resolvedRole = 'admin';
        else if (isVendor) resolvedRole = 'vendor';
        else if (isRider) resolvedRole = 'rider';
      }

      if (shouldRemember) {
        const nextSaved = await saveAccount({
          identifier: data.identifier,
          password: data.password,
          fullName: res.user.fullName,
          role: resolvedRole,
        });
        setSavedAccounts(nextSaved);
      }

      setSession({
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email ?? '',
        phone: res.user.phone ?? '',
      });

      const label = ROLE_OPTIONS.find((r) => r.key === resolvedRole)?.label ?? 'User';
      showToast(`Signed in as ${label}`, 'success');

      if (resolvedRole === 'admin') {
        router.replace('/(admin)/dashboard');
      } else if (resolvedRole === 'vendor') {
        router.replace('/(vendor)/dashboard');
      } else if (resolvedRole === 'rider') {
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
      await performLogin({ identifier: acct.identifier, password: acct.password }, true, acct.role);
    } finally {
      setSigningInSaved(null);
    }
  };

  const handleForget = async (identifier: string) => {
    const next = await removeSavedAccount(identifier);
    setSavedAccounts(next);
    showToast('Account removed from saved list', 'info');
  };

  const filteredSaved = savedAccounts.filter((a) => a.role === selectedRole);

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
            Choose your workspace role, then sign in once for 1-tap access next time.
          </Text>
        </View>

        {/* 2x2 Role Selector */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.6 }}>
            1. CHOOSE YOUR ROLE
          </Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((opt) => {
              const active = selectedRole === opt.key;
              const IconComp = opt.Icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelectedRole(opt.key)}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: active ? opt.bg : colors.surface,
                      borderColor: active ? opt.color : colors.border,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <IconComp size={20} color={active ? opt.color : colors.textSecondary} />
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: active ? opt.color : colors.textPrimary,
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>{opt.sub}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Saved Accounts Filtered for Selected Role */}
        {filteredSaved.length > 0 ? (
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
            {filteredSaved.map((acct) => {
              const busy = signingInSaved === acct.identifier;
              const roleMeta = ROLE_OPTIONS.find((r) => r.key === acct.role) ?? ROLE_OPTIONS[0];
              const RoleIcon = roleMeta.Icon;
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
                  <View style={[styles.roleIcon, { backgroundColor: roleMeta.bg }]}>
                    <RoleIcon size={17} color={roleMeta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                      {busy ? 'Signing in...' : acct.fullName}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textSecondary }} numberOfLines={1}>
                      {roleMeta.label} · {acct.identifier}
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
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Forgot?</Text>
            </Pressable>
          </View>

          <PrimaryButton
            title={`Sign In as ${ROLE_OPTIONS.find((r) => r.key === selectedRole)?.label ?? 'User'}`}
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>

        <View style={styles.footerCol}>
          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 13.5 }}>New customer?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>Sign Up</Text>
            </Pressable>
          </View>
          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 13.5 }}>Own a restaurant?</Text>
            <Pressable onPress={() => router.push('/(auth)/register-restaurant')}>
              <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 13.5 }}>
                Start 7-Day Free Trial
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 22, gap: 18 },
  header: { gap: 6 },
  title: { fontSize: 25, fontWeight: '900' },
  sub: { fontSize: 13.5, lineHeight: 20 },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '48%',
    borderWidth: 2,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
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
  form: { gap: 15 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerCol: { gap: 8, marginTop: 4, alignItems: 'center' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
