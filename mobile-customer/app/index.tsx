import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { ZestRouteLogo } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { authApi, tokenStorage } from '../services/apiClient';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, strings } = useTheme();
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);
  const setSession = useAppStore((s) => s.setSession);
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        let loggedInRole: 'customer' | 'rider' | null = null;
        const token = await tokenStorage.getAccessToken();
        if (token) {
          try {
            const me = await authApi.me();
            setSession({
              id: me.profile._id,
              fullName: me.profile.fullName,
              email: me.profile.email ?? '',
              phone: me.profile.phone ?? '',
            });
            loggedInRole =
              me.roles.includes('rider') && !me.roles.includes('customer') ? 'rider' : 'customer';
          } catch {
            await tokenStorage.clearTokens();
          }
        }
        if (loggedInRole === 'rider') {
          setHasCompletedOnboarding(true);
          router.replace('/(rider)/dashboard');
        } else if (loggedInRole === 'customer') {
          setHasCompletedOnboarding(true);
          router.replace('/(tabs)/home');
        } else {
          const seen = await AsyncStorage.getItem('zr_onboarding_done');
          if (seen === 'true') {
            setHasCompletedOnboarding(true);
            router.replace('/(auth)/welcome');
          } else {
            router.replace('/onboarding');
          }
        }
      } catch {
        router.replace('/onboarding');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [opacity, router, scale, setHasCompletedOnboarding, setSession]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <ZestRouteLogo size={72} compact />
        <Text style={[styles.brand, { color: colors.textPrimary }]}>
          Zest<Text style={{ color: colors.primary }}>Route</Text>
        </Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{strings.brandTagline}</Text>
      </Animated.View>
      <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { alignItems: 'center', gap: 12 },
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 15, fontWeight: '500' },
  loader: { position: 'absolute', bottom: 56 },
});
