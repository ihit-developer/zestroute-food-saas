import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { ArrowRight, Compass, Heart, Home, Receipt, ShoppingCart, User } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';

export default function TabsLayout() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const cartItems = useAppStore((s) => s.cartItems);
  const cartRestaurantName = useAppStore((s) => s.cartRestaurantName);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotalMinor = cartItems.reduce((sum, i) => sum + i.unitPriceMinor * i.quantity, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={String(color)} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => <Compass size={size} color={String(color)} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => <Receipt size={size} color={String(color)} />,
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: ({ color, size }) => <Heart size={size} color={String(color)} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={String(color)} />,
          }}
        />
      </Tabs>

      {/* Global Floating Cart Bar — Accessible From Anywhere */}
      {cartCount > 0 ? (
        <Pressable
          onPress={() => router.push('/cart')}
          style={[
            styles.floatingCart,
            { backgroundColor: colors.primary, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.leftRow}>
            <View style={styles.countCircle}>
              <ShoppingCart size={15} color={colors.primary} />
              <Text style={[styles.countText, { color: colors.primary }]}>{cartCount}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restName} numberOfLines={1}>
                {cartRestaurantName ?? 'Active Cart'}
              </Text>
              <Text style={styles.subText}>{formatMoney(cartTotalMinor)}</Text>
            </View>
          </View>
          <View style={styles.rightRow}>
            <Text style={styles.ctaText}>View Cart</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCart: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 70,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  countCircle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countText: { fontSize: 12, fontWeight: '800' },
  restName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  subText: { color: '#FFF0E3', fontSize: 12, fontWeight: '600' },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
