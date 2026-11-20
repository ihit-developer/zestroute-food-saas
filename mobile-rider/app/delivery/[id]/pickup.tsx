import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckSquare, MapPin, Navigation, Phone } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../../components/ui/RiderUI';

export default function RiderPickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const [verified, setVerified] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Pickup Management"
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
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Restaurant Route Navigation</Text>
          <SecondaryButton
            title="Open Maps Navigation"
            leftIcon={<MapPin size={16} color={colors.primary} />}
            onPress={() => showToast('External Maps intent connects in Phase 11')}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Restaurant Info</Text>
            <StatusBadge label="Ready for Pickup" tone="info" />
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Restaurant address, order number, and item checklist load from MongoDB in Phase 11.
          </Text>
          <SecondaryButton
            title="Call Restaurant"
            leftIcon={<Phone size={16} color={colors.textPrimary} />}
            onPress={() => showToast('Dialer intent connects in Phase 11')}
          />
        </View>

        <SecondaryButton
          title={verified ? 'Pickup Items Verified ✓' : 'Verify Order Items & Packaging'}
          leftIcon={<CheckSquare size={18} color={verified ? colors.success : colors.textPrimary} />}
          onPress={() => setVerified((v) => !v)}
        />

        <PrimaryButton
          title="Mark as Picked Up"
          fullWidth
          disabled={!verified}
          onPress={() => router.push(`/delivery/${id ?? 'active'}/dropoff`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  mapCard: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
