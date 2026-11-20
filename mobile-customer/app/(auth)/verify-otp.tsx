import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, SecondaryButton, useToast } from '../../components/ui';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    if (otp.trim().length < 6) {
      showToast('Enter the 6-digit verification code sent to your email/phone', 'error');
      return;
    }
    showToast('Real OTP verification connects in Phase 8', 'info');
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <IconButton
        icon={<ArrowLeft size={20} color={colors.textPrimary} />}
        accessibilityLabel="Back"
        onPress={() => router.back()}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Verify Code</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Enter the 6-digit verification code sent via email or SMS.
        </Text>
      </View>

      <InputField
        label="6-Digit OTP"
        placeholder="Enter 6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        leftIcon={<ShieldCheck size={18} color={colors.textSecondary} />}
      />

      <PrimaryButton title="Verify & Continue" fullWidth onPress={handleVerify} />
      <SecondaryButton
        title="Resend Code"
        fullWidth
        onPress={() => showToast('OTP resend endpoint connects in Phase 8', 'info')}
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
