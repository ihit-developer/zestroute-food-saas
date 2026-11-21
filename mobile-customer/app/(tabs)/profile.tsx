import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LogOut,
  MapPin,
  Settings,
  User,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { ConfirmationDialog, PrimaryButton, SecondaryButton, TopNav } from '../../components/ui';
import { useAppStore } from '../../store/useAppStore';
import { useFavorites } from '../../hooks/useCustomerData';
import { authApi, tokenStorage } from '../../services/apiClient';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const cartCount = useAppStore((s) => s.cartItems.reduce((acc, i) => acc + i.quantity, 0));
  const setSession = useAppStore((s) => s.setSession);
  const { data: favs } = useFavorites();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const initials = (user?.fullName ?? 'G')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuRows = [
    { label: 'Edit Profile & Phone', icon: User, route: '/profile/edit' },
    { label: 'Delivery Addresses', icon: MapPin, route: '/addresses' },
    { label: 'Wallet & Loyalty Points', icon: Wallet, route: '/wallet' },
    { label: 'Notifications', icon: Bell, route: '/notifications' },
    { label: 'Help Center & Support', icon: HelpCircle, route: '/support' },
    { label: 'Settings (Language & Theme)', icon: Settings, route: '/settings' },
  ] as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav title="Profile" subtitle="Account, addresses & preferences" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {user?.fullName ?? 'Guest Customer'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {user?.email || 'Sign in to sync orders, wallet, and addresses'}
            </Text>
            {user?.phone ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{user.phone}</Text>
            ) : null}
          </View>
        </View>

        {isAuthenticated ? (
          <View style={styles.statsRow}>
            {[
              { label: 'Cart Items', val: String(cartCount), onPress: () => router.push('/cart') },
              {
                label: 'Saved Favorites',
                val: String(favs.foods.length + favs.restaurants.length),
                onPress: () => router.push('/(tabs)/favorites'),
              },
              { label: 'My Orders', val: 'View', onPress: () => router.push('/(tabs)/orders') },
            ].map((s) => (
              <Pressable
                key={s.label}
                onPress={s.onPress}
                style={[
                  styles.statBox,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
                ]}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{s.val}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <PrimaryButton title="Sign In / Create Account" fullWidth onPress={() => router.push('/(auth)/welcome')} />
        )}

        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          {menuRows.map((row, idx) => {
            const Icon = row.icon;
            return (
              <Pressable
                key={row.route}
                onPress={() => router.push(row.route)}
                style={[
                  styles.menuRow,
                  idx < menuRows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <Icon size={18} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
                    {row.label}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

        {isAuthenticated ? (
          <SecondaryButton
            title="Log Out"
            leftIcon={<LogOut size={18} color={colors.error} />}
            onPress={() => setLogoutOpen(true)}
          />
        ) : null}
      </ScrollView>

      <ConfirmationDialog
        visible={logoutOpen}
        title="Log Out?"
        message="Are you sure you want to log out of your Dastarkhwan account?"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={async () => {
          setLogoutOpen(false);
          const refresh = await tokenStorage.getRefreshToken();
          if (refresh) {
            await authApi.logout(refresh).catch(() => {});
          }
          await tokenStorage.clearTokens();
          setSession(null);
          router.replace('/(auth)/welcome');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  profileCard: { padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, padding: 12, borderWidth: 1, alignItems: 'center', gap: 3 },
  listCard: { borderWidth: 1, overflow: 'hidden' },
  menuRow: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
