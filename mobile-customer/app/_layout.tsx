import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '../hooks/useTheme';
import { ToastProvider, useToast } from '../components/ui';
import { useNotifications } from '../hooks/useCustomerData';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

const LiveNotificationWatcher: React.FC = () => {
  const { data } = useNotifications();
  const { showToast } = useToast();
  const initialized = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialized.current) {
      if (data.length > 0) {
        data.forEach((n) => seenIds.current.add(n.id));
        initialized.current = true;
      }
      return;
    }

    const fresh = data.filter((n) => !n.isRead && !seenIds.current.has(n.id));
    if (fresh.length > 0) {
      fresh.forEach((n) => seenIds.current.add(n.id));
      const latest = fresh[0];
      showToast(`${latest.title} — ${latest.body}`, 'info');
    }
  }, [data, showToast]);

  return null;
};

const RootNavigator: React.FC = () => {
  const { mode, colors } = useTheme();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsub();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <LiveNotificationWatcher />
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.error }]}>
          <WifiOff size={14} color="#FFFFFF" />
          <Text style={styles.offlineText}>No internet connection. Reconnecting...</Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: '#0F172A' } }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(rider)" />
        <Stack.Screen name="(vendor)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="food/[id]" />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="checkout/index" />
        <Stack.Screen name="addresses/index" />
        <Stack.Screen name="addresses/form" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="order/tracking/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="wallet/index" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="support/index" />
        <Stack.Screen name="support/new-ticket" />
        <Stack.Screen name="support/ticket/[id]" />
        <Stack.Screen name="settings/index" />
      </Stack>
    </View>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
