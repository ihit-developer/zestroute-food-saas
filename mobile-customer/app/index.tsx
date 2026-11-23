import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

  const logoScale = useRef(new Animated.Value(0.76)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0.92)).current;
  const textTranslateY = useRef(new Animated.Value(18)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 65,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1.09,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 0.94,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

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
    }, 1250);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, [
    logoOpacity,
    logoScale,
    progressAnim,
    ringPulse,
    router,
    setHasCompletedOnboarding,
    setSession,
    textOpacity,
    textTranslateY,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Subtle ambient background glow circles */}
      <View style={styles.bgOrbTop} pointerEvents="none" />
      <View style={styles.bgOrbBottom} pointerEvents="none" />

      <View style={styles.center}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.outerGlowRing,
              { transform: [{ scale: ringPulse }], opacity: logoOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.logoHalo,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image source={APP_LOGO} style={styles.logoImg} resizeMode="cover" />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.brandBlock,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <Text style={styles.brand}>
            Dastar<Text style={{ color: '#FF8A2B' }}>khwan</Text>
          </Text>
          <Text style={styles.tagline}>{strings.brandTagline}</Text>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>CUSTOMER · RIDER · LIVE GPS</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.loaderWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.loaderText}>Preparing your Dastarkhwan experience...</Text>
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
    overflow: 'hidden',
  },
  bgOrbTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 99, 12, 0.14)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 148, 54, 0.10)',
  },
  center: {
    alignItems: 'center',
    gap: 18,
  },
  logoStage: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 148, 54, 0.35)',
    backgroundColor: 'rgba(244, 99, 12, 0.12)',
  },
  logoHalo: {
    padding: 6,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 148, 54, 0.22)',
    shadowColor: '#F4630C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  logoImg: {
    width: 112,
    height: 112,
    borderRadius: 28,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },
  tagline: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '600',
    textAlign: 'center',
  },
  pill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#4ADE80',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FDBA74',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 48,
    width: '72%',
    maxWidth: 260,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FF8A2B',
  },
  loaderText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
});
