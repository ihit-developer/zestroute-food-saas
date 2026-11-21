import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { authApi, tokenStorage } from '../services/apiClient';

const APP_LOGO = require('../assets/icon.png');

export default function SplashScreen() {
  const router = useRouter();
  const { strings } = useTheme();
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);
  const setSession = useAppStore((s) => s.setSession);
  const scale = useRef(new Animated.Value(0.84)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: true }),
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
    }, 1050);

    return () => clearTimeout(timer);
  }, [opacity, router, scale, setHasCompletedOnboarding, setSession]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoHalo}>
          <Image source={APP_LOGO} style={styles.logoImg} resizeMode="cover" />
        </View>
        <Text style={styles.brand}>
          Zest<Text style={{ color: '#F47B20' }}>Route</Text>
        </Text>
        <Text style={styles.tagline}>{strings.brandTagline}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>CUSTOMER · RIDER · LIVE GPS</Text>
        </View>
      </Animated.View>
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color="#F47B20" />
        <Text style={styles.loaderText}>Connecting to ZestRoute...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  center: { alignItems: 'center', gap: 12 },
  logoHalo: {
    padding: 6,
    borderRadius: 34,
    backgroundColor: 'rgba(244, 123, 32, 0.2)',
    shadowColor: '#F47B20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImg: {
    width: 108,
    height: 108,
    borderRadius: 28,
  },
  brand: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  pill: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FDBA74',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
