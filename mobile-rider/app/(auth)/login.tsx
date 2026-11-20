import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { InputField, PrimaryButton, SecondaryButton, ZestRouteLogo, useToast } from '../../components/ui/RiderUI';
import { riderLoginSchema } from '../../features/validation/riderSchemas';
import { riderAuthApi, riderTokenStorage } from '../../services/apiClient';
import { useRiderStore } from '../../store/useRiderStore';
import { ApiClientError } from '@zestroute/shared';

type LoginForm = { identifier: string; password: string };

export default function RiderLoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const setSession = useRiderStore((s) => s.setSession);
  const [showPass, setShowPass] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(riderLoginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await riderAuthApi.login(data);
      if (!res.user.roles.includes('rider')) {
        showToast('This account does not have Rider permissions');
        return;
      }
      await riderTokenStorage.setTokens(res.accessToken, res.refreshToken);
      setSession(
        {
          id: res.user.id,
          fullName: res.user.fullName,
          phone: res.user.phone ?? '',
          vehicleType: 'bike',
          vehicleNumber: '—',
          ratingAvg: 0,
        },
        'approved'
      );
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to reach authentication server';
      showToast(msg);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ZestRouteLogo size={46} />
        <View style={{ gap: 6, marginTop: 12 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Rider Partner Sign In</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            Access delivery requests, live navigation, and earnings.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <Controller
            control={control}
            name="identifier"
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Email or Phone"
                placeholder="rider@example.com or 03001234567"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.identifier?.message}
                leftIcon={<Mail size={18} color={colors.textSecondary} />}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Password"
                placeholder="Enter password"
                secureTextEntry={!showPass}
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                leftIcon={<Lock size={18} color={colors.textSecondary} />}
                rightElement={
                  <Pressable onPress={() => setShowPass((s) => !s)}>
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
        </View>

        <PrimaryButton title="Sign In" fullWidth onPress={handleSubmit(onSubmit)} />
        <SecondaryButton
          title="Register as a New Rider"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
        />
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={() => void Linking.openURL('http://localhost:8081')}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
              Ordering food? Open Customer Login / Register
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 20 },
  title: { fontSize: 25, fontWeight: '700' },
});
