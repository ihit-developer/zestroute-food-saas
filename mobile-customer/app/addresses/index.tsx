import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  PrimaryButton,
  StatusBadge,
  TopNav,
} from '../../components/ui';
import { useSavedAddresses } from '../../hooks/useCustomerData';

export default function AddressesScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { data, isLoading, isError, refetch } = useSavedAddresses();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Delivery Addresses"
        subtitle="Manage saved locations"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          <IconButton
            icon={<Plus size={18} color={colors.primary} />}
            accessibilityLabel="Add address"
            onPress={() => router.push('/addresses/form')}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <LoadingSkeleton height={100} />
        ) : isError ? (
          <ErrorState message="Unable to load saved addresses." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No saved addresses"
            description="Add your Home, Office, or Other delivery addresses for faster checkout."
            actionLabel="Add New Address"
            onAction={() => router.push('/addresses/form')}
          />
        ) : (
          data.map((addr, idx) => {
            const addrKey = addr.id ?? (addr as unknown as { _id?: string })._id ?? String(idx);
            const labelText = (addr.label ?? 'home').toUpperCase();
            return (
              <View
                key={addrKey}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                    {labelText}
                  </Text>
                  {addr.isDefault ? <StatusBadge label="Default" tone="success" /> : null}
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  {[addr.houseNumber, addr.street, addr.area, addr.city].filter(Boolean).join(', ')}
                </Text>
              </View>
            );
          })
        )}

        <PrimaryButton
          title="Add New Address"
          fullWidth
          onPress={() => router.push('/addresses/form')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
