import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ShoppingBag, Store } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { PrimaryButton } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

const APP_LOGO = require('../assets/icon.png');

const SLIDES = [
  {
    key: 'discover',
    title: 'Discover Nearby Restaurants',
    subtitle: 'Explore top-rated local kitchens, curated cuisines, and exclusive daily offers around you.',
    Icon: Store,
  },
  {
    key: 'order',
    title: 'Order Your Favorite Food',
    subtitle: 'Customize sizes, toppings, sauces, and special instructions with transparent pricing.',
    Icon: ShoppingBag,
  },
  {
    key: 'track',
    title: 'Track Delivery in Real Time',
    subtitle: 'Follow your order from kitchen preparation to your doorstep with live rider GPS.',
    Icon: MapPin,
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);
  const [step, setStep] = useState(0);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('zr_onboarding_done', 'true').catch(() => {});
    setHasCompletedOnboarding(true);
    router.replace('/(auth)/welcome');
  };

  const current = SLIDES[step];
  const Icon = current.Icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={APP_LOGO} style={styles.brandIcon} resizeMode="cover" />
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>
            Dastar<Text style={{ color: colors.primary }}>khwan</Text>
          </Text>
        </View>
        <Pressable onPress={finishOnboarding} hitSlop={10}>
          <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={[styles.illustration, { backgroundColor: colors.primarySoft, borderRadius: radii.xl }]}>
          <Icon size={64} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{current.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{current.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, idx) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                {
                  width: idx === step ? 24 : 8,
                  backgroundColor: idx === step ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        <PrimaryButton
          title={isLast ? 'Get Started' : 'Next'}
          fullWidth
          onPress={() => {
            if (isLast) {
              finishOnboarding();
            } else {
              setStep((s) => s + 1);
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 10 },
  brandName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  skip: { fontSize: 15, fontWeight: '600' },
  center: { alignItems: 'center', gap: 18, paddingHorizontal: 8 },
  illustration: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  footer: { gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 9999 },
});
