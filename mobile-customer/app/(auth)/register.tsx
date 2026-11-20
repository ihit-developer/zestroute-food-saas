import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, useToast } from '../../components/ui';
import { registerSchema } from '../../features/validation/authSchemas';
import { authApi, httpClient, tokenStorage } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';
import { ApiClientError } from '@zestroute/shared';

type RegisterForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);
  const [showPass, setShowPass] = useState(false);
  const [accountRole, setAccountRole] = useState<'customer' | 'rider'>('customer');
  const [vehicleNumber, setVehicleNumber] = useState('LEA-2026');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await authApi.register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: accountRole,
      });
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);
      if (accountRole === 'rider') {
        try {
          await httpClient.post('/rider/apply', {
            vehicleType: 'bike',
            vehicleNumber: vehicleNumber.trim() || 'LEA-2026',
            cnicMasked: '35202-0000000-1',
            licenseNumber: 'DL-2026-001',
          });
        } catch {
          // Ignore if profile already created
        }
      }
      setSession({
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email ?? '',
        phone: res.user.phone ?? '',
      });
      showToast(accountRole === 'rider' ? 'Rider account created!' : 'Account created!', 'success');
      router.replace(accountRole === 'rider' ? '/(rider)/dashboard' : '/(tabs)/home');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to reach registration server';
      showToast(msg, 'error');
    }
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Choose Customer to order food or Rider to accept deliveries.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['customer', 'rider'] as const).map((r) => {
            const active = accountRole === r;
            return (
              <Pressable
                key={r}
                onPress={() => setAccountRole(r)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: active ? colors.primary : colors.textSecondary }}>
                  {r === 'customer' ? 'Customer' : 'Rider'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {accountRole === 'rider' ? (
          <InputField
            label="Vehicle Plate Number"
            placeholder="LEA-2026"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Full Name"
                placeholder="Ayesha Khan"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
                leftIcon={<User size={18} color={colors.textSecondary} />}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Email Address"
                placeholder="ayesha@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                leftIcon={<Mail size={18} color={colors.textSecondary} />}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Phone Number"
                placeholder="03001234567"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                leftIcon={<Phone size={18} color={colors.textSecondary} />}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                secureTextEntry={!showPass}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
                rightElement={
                  <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={8}>
                    {showPass ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>
                }
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <InputField
                label="Confirm Password"
                placeholder="Re-enter password"
                secureTextEntry={!showPass}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
              />
            )}
          />

          <PrimaryButton
            title="Create Account"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Already registered?</Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Sign In</Text>
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
  title: { fontSize: 26, fontWeight: '700' },
  sub: { fontSize: 15 },
  form: { gap: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
