import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, MapPin, Navigation, Phone, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import {
  DocumentUploader,
  IconButton,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../../components/ui/RiderUI';
import { deliveryIssueSchema, deliveryOtpSchema } from '../../../features/validation/riderSchemas';

export default function RiderDropoffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const [issueOpen, setIssueOpen] = useState(false);

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(deliveryOtpSchema),
    defaultValues: { otp: '' },
  });

  const issueForm = useForm<{ reason: string }>({
    resolver: zodResolver(deliveryIssueSchema),
    defaultValues: { reason: '' },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Customer Delivery"
        subtitle={`Delivery ${id ?? ''}`}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.mapCard, { backgroundColor: colors.skeletonBase, borderRadius: radii.lg }]}>
          <Navigation size={28} color={colors.primary} />
          <StatusBadge label="Live GPS Broadcast Ready (Phase 13)" tone="primary" />
          <SecondaryButton
            title="Navigate to Customer"
            leftIcon={<MapPin size={16} color={colors.primary} />}
            onPress={() => showToast('Customer map navigation connects in Phase 11')}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Customer Dropoff</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Customer address, delivery instructions, and protected contact options load from MongoDB in Phase 11.
          </Text>
          <SecondaryButton
            title="Contact Customer"
            leftIcon={<Phone size={16} color={colors.textPrimary} />}
            onPress={() => showToast('Masked customer call connects in Phase 11')}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            Delivery Verification (Required)
          </Text>
          <Controller
            control={otpForm.control}
            name="otp"
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Customer Delivery OTP"
                placeholder="Enter 4–6 digit OTP from customer"
                keyboardType="number-pad"
                maxLength={6}
                value={value}
                onChangeText={onChange}
                error={otpForm.formState.errors.otp?.message}
                leftIcon={<ShieldCheck size={18} color={colors.textSecondary} />}
              />
            )}
          />
          <DocumentUploader
            label="Delivery Proof Photo"
            helperText="Capture parcel at doorstep (optional/policy-based)"
            onPress={() => showToast('Camera proof upload connects in Phase 11')}
          />
        </View>

        <PrimaryButton
          title="Confirm & Complete Delivery"
          fullWidth
          onPress={otpForm.handleSubmit(() => {
            showToast('Server-side OTP verification connects in Phase 11');
            router.replace('/(tabs)/dashboard');
          })}
        />

        <SecondaryButton
          title="Report Delivery Issue"
          leftIcon={<AlertTriangle size={16} color={colors.error} />}
          onPress={() => setIssueOpen(true)}
        />
      </ScrollView>

      <Modal visible={issueOpen} onClose={() => setIssueOpen(false)} title="Report Delivery Problem">
        <View style={{ gap: 12 }}>
          <Controller
            control={issueForm.control}
            name="reason"
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Issue Description"
                placeholder="Customer unreachable, wrong address, damaged item..."
                multiline
                numberOfLines={3}
                value={value}
                onChangeText={onChange}
                error={issueForm.formState.errors.reason?.message}
              />
            )}
          />
          <PrimaryButton
            title="Submit Issue Report"
            fullWidth
            onPress={issueForm.handleSubmit(() => {
              setIssueOpen(false);
              showToast('Delivery issue logged for Admin support');
            })}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  mapCard: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
});
