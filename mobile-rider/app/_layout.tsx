import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '../hooks/useTheme';
import { ToastProvider } from '../components/ui/RiderUI';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 20_000 } },
});

const RootShell: React.FC = () => {
  const { mode, colors } = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOffline(s.isConnected === false));
    return () => unsub();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {offline && (
        <View style={[styles.offline, { backgroundColor: colors.error }]}>
          <WifiOff size={14} color="#FFFFFF" />
          <Text style={styles.offlineText}>Offline — GPS &amp; delivery updates paused</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="delivery/[id]/pickup" />
        <Stack.Screen name="delivery/[id]/dropoff" />
      </Stack>
    </View>
  );
};

export default function RiderRootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <RootShell />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  offline: { paddingVertical: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  offlineText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
