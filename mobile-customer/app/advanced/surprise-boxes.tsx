import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, PackageOpen } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState, IconButton, TopNav } from '../../components/ui';

export default function SurpriseBoxesScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Food Surprise Boxes"
        subtitle="Discounted mystery packages & festival deals"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.row}>
            <PackageOpen size={18} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              Food Safety &amp; Content Notice
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Surprise boxes contain fresh surplus items from participating kitchens with clearly listed pickup windows and allergen notes.
          </Text>
        </View>

        <EmptyState
          title="No surprise boxes available right now"
          description="Check back near closing hours or during Ramadan/Festival campaigns."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
