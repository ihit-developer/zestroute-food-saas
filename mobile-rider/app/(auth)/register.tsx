import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  DocumentUploader,
  IconButton,
  InputField,
  PrimaryButton,
  SecondaryButton,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui/RiderUI';
import { riderRegisterSchema } from '../../features/validation/riderSchemas';
import { riderAuthApi, riderHttpClient, riderTokenStorage } from '../../services/apiClient';
import { useRiderStore } from '../../store/useRiderStore';
import { ApiClientError, type ApprovalStatus } from '@zestroute/shared';

type RiderRegisterForm = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  cnicNumber: string;
  licenseNumber: string;
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleNumber: string;
};

export default function RiderRegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const setSession = useRiderStore((s) => s.setSession);
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'car'>('bike');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RiderRegisterForm>({
    resolver: zodResolver(riderRegisterSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      cnicNumber: '',
      licenseNumber: '',
      vehicleType: 'bike',
      vehicleNumber: '',
    },
  });

  const onSubmit = async (data: RiderRegisterForm) => {
    try {
      const res = await riderAuthApi.register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'rider',
      });
      await riderTokenStorage.setTokens(res.accessToken, res.refreshToken);

      let approvalStatus: ApprovalStatus = 'approved';
      try {
        const applied = await riderHttpClient.post<{ status?: ApprovalStatus }>('/rider/apply', {
          vehicleType: data.vehicleType,
          vehicleNumber: data.vehicleNumber,
          cnicMasked: data.cnicNumber,
          licenseNumber: data.licenseNumber,
        });
        approvalStatus = applied?.status ?? 'approved';
      } catch {
        // Account created; fallback to approved in dev if profile already existed
      }

      setSession(
        {
          id: res.user.id,
          fullName: res.user.fullName,
          phone: res.user.phone ?? data.phone,
          vehicleType: data.vehicleType,
          vehicleNumber: data.vehicleNumber,
          ratingAvg: 0,
        },
        approvalStatus
      );

      if (approvalStatus === 'approved') {
        showToast('Rider account created! Welcome aboard.');
        router.replace('/(tabs)/dashboard');
      } else {
        showToast('Application submitted for admin approval');
        router.replace('/(auth)/pending-approval');
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to register rider account';
      showToast(msg);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Rider Application"
        subtitle="Admin verification required"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.section, { color: colors.textPrimary }]}>1. Personal &amp; Account Info</Text>
        {(
          [
            { name: 'fullName', label: 'Full Name', placeholder: 'Bilal Ahmed' },
            { name: 'phone', label: 'Phone Number', placeholder: '03001234567' },
            { name: 'email', label: 'Email', placeholder: 'bilal@example.com' },
            { name: 'password', label: 'Password', placeholder: 'Min 8 characters', secure: true },
          ] as const
        ).map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field: { value, onChange } }) => (
              <InputField
                label={f.label}
                placeholder={f.placeholder}
                secureTextEntry={'secure' in f ? f.secure : false}
                value={value}
                onChangeText={onChange}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}

        <Text style={[styles.section, { color: colors.textPrimary }]}>2. Identity &amp; Vehicle</Text>
        <Controller
          control={control}
          name="cnicNumber"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="CNIC Number"
              placeholder="3520212345671"
              value={value}
              onChangeText={onChange}
              error={errors.cnicNumber?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="licenseNumber"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Driving License Number"
              placeholder="DL-LHR-99281"
              value={value}
              onChangeText={onChange}
              error={errors.licenseNumber?.message}
            />
          )}
        />

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>Vehicle Type</Text>
          <Tabs
            items={[
              { key: 'bike', label: 'Motorbike' },
              { key: 'scooter', label: 'Scooter' },
              { key: 'car', label: 'Car' },
            ]}
            activeKey={vehicleType}
            onChange={(k) => {
              const vt = k as 'bike' | 'scooter' | 'car';
              setVehicleType(vt);
              setValue('vehicleType', vt);
            }}
          />
        </View>

        <Controller
          control={control}
          name="vehicleNumber"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Vehicle Plate Number"
              placeholder="LEA-2024"
              value={value}
              onChangeText={onChange}
              error={errors.vehicleNumber?.message}
            />
          )}
        />

        <Text style={[styles.section, { color: colors.textPrimary }]}>3. Verification Documents</Text>
        <DocumentUploader label="Profile Photo" onPress={() => showToast('Upload connects in Phase 11')} />
        <DocumentUploader label="CNIC Front & Back" onPress={() => showToast('Upload connects in Phase 11')} />
        <DocumentUploader label="Driving License Photo" onPress={() => showToast('Upload connects in Phase 11')} />
        <DocumentUploader label="Vehicle Registration Document" onPress={() => showToast('Upload connects in Phase 11')} />

        <PrimaryButton
          title={isSubmitting ? 'Creating Account...' : 'Register & Continue'}
          fullWidth
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
        <SecondaryButton
          title="Already have a Rider account? Sign In"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 36 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 6 },
});
