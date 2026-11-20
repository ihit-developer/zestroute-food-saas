import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { ZestRouteLogo } from '../components/ui/RiderUI';
import { useRiderStore } from '../store/useRiderStore';
import { riderAuthApi, riderTokenStorage } from '../services/apiClient';

export default function RiderSplashScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const isAuthenticated = useRiderStore((s) => s.isAuthenticated);
  const approvalStatus = useRiderStore((s) => s.approvalStatus);
  const setSession = useRiderStore((s) => s.setSession);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (!isAuthenticated) {
          const token = await riderTokenStorage.getAccessToken();
          if (token) {
            try {
              const me = await riderAuthApi.me();
              if (me.roles.includes('rider')) {
                setSession(
                  {
                    id: me.profile._id,
                    fullName: me.profile.fullName,
                    phone: me.profile.phone ?? '',
                    vehicleType: 'bike',
                    vehicleNumber: '—',
                    ratingAvg: 0,
                  },
                  'approved'
                );
                router.replace('/(tabs)/dashboard');
                return;
              }
            } catch {
              await riderTokenStorage.clearTokens();
            }
          }
          router.replace('/(auth)/login');
        } else if (approvalStatus !== 'approved') {
          router.replace('/(auth)/pending-approval');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      } catch {
        router.replace('/(auth)/login');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [approvalStatus, isAuthenticated, router, setSession]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ZestRouteLogo size={60} />
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 10 }}>
        Deliver fresh, earn reliably
      </Text>
      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
