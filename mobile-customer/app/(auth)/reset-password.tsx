import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, useToast } from '../../components/ui';
import { resetPasswordSchema } from '../../features/validation/authSchemas';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <IconButton
        icon={<ArrowLeft size={20} color={colors.textPrimary} />}
        accessibilityLabel="Back"
        onPress={() => router.back()}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Choose a strong new password for your Dastarkhwan account.
        </Text>
      </View>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <InputField
            label="New Password"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
            leftIcon={<Lock size={18} color={colors.textSecondary} />}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange } }) => (
          <InputField
            label="Confirm New Password"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.confirmPassword?.message}
            leftIcon={<Lock size={18} color={colors.textSecondary} />}
          />
        )}
      />
      <PrimaryButton
        title="Update Password"
        fullWidth
        onPress={handleSubmit(() => {
          showToast('Password reset flow ready for Phase 8 API', 'success');
          router.replace('/(auth)/login');
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, gap: 18 },
  header: { gap: 6 },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { fontSize: 14 },
});
