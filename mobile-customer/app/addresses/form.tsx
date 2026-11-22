import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  IconButton,
  InputField,
  PrimaryButton,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { LocationPinMap } from '../../components/LocationPinMap';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@zestroute/shared';
import { addressSchema } from '../../features/validation/authSchemas';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

type AddressForm = {
  label: 'home' | 'office' | 'other';
  fullName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  houseNumber: string;
  building?: string;
  landmark?: string;
  deliveryInstructions?: string;
};

export default function AddressFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSelectedAddress = useAppStore((s) => s.setSelectedAddress);
  const [labelType, setLabelType] = useState<'home' | 'office' | 'other'>('home');
  const [pinLat, setPinLat] = useState(31.5204);
  const [pinLng, setPinLng] = useState(74.3587);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: 'home',
      fullName: '',
      phone: '',
      city: '',
      area: '',
      street: '',
      houseNumber: '',
    },
  });

  const onSave = async (values: AddressForm) => {
    try {
      const created = await httpClient.post<{ _id: string }>('/addresses', {
        label: values.label,
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        city: values.city.trim(),
        area: values.area.trim(),
        street: values.street.trim(),
        houseNumber: values.houseNumber.trim(),
        building: values.building?.trim() || undefined,
        landmark: values.landmark?.trim() || undefined,
        deliveryInstructions: values.deliveryInstructions?.trim() || undefined,
        latitude: pinLat,
        longitude: pinLng,
        isDefault: true,
      });
      setSelectedAddress({
        id: created._id,
        label: values.label,
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        city: values.city.trim(),
        area: values.area.trim(),
        street: values.street.trim(),
        houseNumber: values.houseNumber.trim(),
        latitude: pinLat,
        longitude: pinLng,
        isDefault: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'addresses'] });
      showToast('Delivery address saved!', 'success');
      router.back();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to save address', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Address Details"
        subtitle="Pin location & delivery info"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <LocationPinMap
          mode="picker"
          latitude={pinLat}
          longitude={pinLng}
          height={230}
          onPinChange={({ latitude, longitude, city, area, street }) => {
            setPinLat(latitude);
            setPinLng(longitude);
            if (city) setValue('city', city);
            if (area) setValue('area', area);
            if (street) setValue('street', street);
            showToast('Live location pinned on map!', 'success');
          }}
        />

        <Tabs
          items={[
            { key: 'home', label: 'Home' },
            { key: 'office', label: 'Office' },
            { key: 'other', label: 'Other' },
          ]}
          activeKey={labelType}
          onChange={(k) => {
            const typed = k as 'home' | 'office' | 'other';
            setLabelType(typed);
            setValue('label', typed);
          }}
        />

        {(
          [
            { name: 'fullName', label: 'Full Name', placeholder: 'Recipient name' },
            { name: 'phone', label: 'Phone Number', placeholder: '03001234567' },
            { name: 'city', label: 'City', placeholder: 'Lahore / Karachi / Islamabad' },
            { name: 'area', label: 'Area / Sector', placeholder: 'Gulberg III' },
            { name: 'street', label: 'Street', placeholder: 'Street 12' },
            { name: 'houseNumber', label: 'House / Flat Number', placeholder: 'House 42-B' },
            { name: 'landmark', label: 'Nearby Landmark (Optional)', placeholder: 'Near Main Park' },
            { name: 'deliveryInstructions', label: 'Delivery Instructions', placeholder: 'Gate code or directions' },
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
                value={value ?? ''}
                onChangeText={onChange}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}

        <PrimaryButton title="Save Address" fullWidth onPress={handleSubmit(onSave)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  mapPlaceholder: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
