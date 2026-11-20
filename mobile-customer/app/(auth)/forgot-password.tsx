import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton } from '../../components/ui';
import { forgotPasswordSchema } from '../../features/validation/authSchemas';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ identifier: string }>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: '' },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <IconButton
        icon={<ArrowLeft size={20} color={colors.textPrimary} />}
        accessibilityLabel="Back"
        onPress={() => router.back()}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Forgot Password</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Enter your email or phone number to receive a verification code.
        </Text>
      </View>
      <Controller
        control={control}
        name="identifier"
        render={({ field: { value, onChange } }) => (
          <InputField
            label="Email or Phone"
            placeholder="you@example.com"
            value={value}
            onChangeText={onChange}
            error={errors.identifier?.message}
            leftIcon={<Mail size={18} color={colors.textSecondary} />}
          />
        )}
      />
      <PrimaryButton
        title="Send Verification Code"
        fullWidth
        onPress={handleSubmit(() => router.push('/(auth)/verify-otp'))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, gap: 20 },
  header: { gap: 6 },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { fontSize: 14 },
});
