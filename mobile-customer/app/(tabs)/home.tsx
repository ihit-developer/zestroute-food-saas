import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Flame,
  MapPin,
  ShoppingCart,
  Sparkles,
  Store,
  User,
} from 'lucide-react-native';
import type { FoodCardData, RestaurantCardData } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FoodCard,
  IconButton,
  LoadingSkeleton,
  RestaurantCard,
  SearchBar,
  useToast,
} from '../../components/ui';
import { ActiveRestaurantBar } from '../../components/ActiveRestaurantBar';
import { useFavorites, useHomeFeed, useNotifications } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';
import { useAppStore, type ActiveRestaurantSession } from '../../store/useAppStore';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [pendingRestSwitch, setPendingRestSwitch] = useState<ActiveRestaurantSession | null>(null);

  const selectedAddress = useAppStore((s) => s.selectedAddress);
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const activeRestaurant = useAppStore((s) => s.activeRestaurant);
  const switchActiveRestaurant = useAppStore((s) => s.switchActiveRestaurant);
  const addToCart = useAppStore((s) => s.addToCart);
  const cartRestaurantName = useAppStore((s) => s.cartRestaurantName);
  const cartCount = useAppStore((s) => s.cartItems.reduce((acc, i) => acc + i.quantity, 0));

  const { data, isLoading, isError, refetch } = useHomeFeed(activeRestaurant?.id ?? null);
  const { data: favData } = useFavorites();
  const { data: notifications } = useNotifications();
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const favFoodIds = useMemo(() => new Set(favData.foods.map((f) => f.id)), [favData.foods]);
  const favRestIds = useMemo(() => new Set(favData.restaurants.map((r) => r.id)), [favData.restaurants]);

  const isMultiRestaurant = data.popularRestaurants.length > 1;
  const singleRestaurant = data.popularRestaurants[0];

  const toggleFavorite = async (targetType: 'food' | 'restaurant', targetId: string) => {
    if (!isAuthenticated) {
      showToast('Please sign in to save favorites', 'info');
      router.push('/(auth)/login');
      return;
    }
    try {
      await httpClient.post('/favorites/toggle', { targetType, targetId });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'favorites'] });
      showToast('Favorites updated', 'success');
    } catch {
      showToast('Unable to update favorite', 'error');
    }
  };

  const handleRestaurantPress = (rest: RestaurantCardData) => {
    const next: ActiveRestaurantSession = {
      id: rest.id,
      name: rest.name,
      cuisineLabel: rest.cuisineLabel,
      locationLabel: rest.locationLabel,
    };
    const res = switchActiveRestaurant(next, false);
    if (res === 'needs_confirm') {
      setPendingRestSwitch(next);
      return;
    }
    router.push(`/restaurant/${rest.id}`);
  };

  const handleConfirmSwitchAndOpen = () => {
    if (!pendingRestSwitch) return;
    const target = pendingRestSwitch;
    switchActiveRestaurant(target, true);
    setPendingRestSwitch(null);
    showToast(`Switched kitchen to ${target.name}`, 'success');
    router.push(`/restaurant/${target.id}`);
  };

  const handleQuickAdd = (food: FoodCardData) => {
    const restName = food.restaurantName ?? activeRestaurant?.name ?? singleRestaurant?.name ?? 'Restaurant';
    const status = addToCart(food.restaurantId, restName, {
      id: `${food.id}-base`,
      foodId: food.id,
      name: food.name,
      unitPriceMinor: food.discountPriceMinor ?? food.regularPriceMinor,
      quantity: 1,
      customizations: [],
    });
    if (status === 'added') {
      showToast(`${food.name} added to ${restName} cart`, 'success');
    }
  };

  const q = search.trim().toLowerCase();

  const filteredRestaurants = useMemo(
    () =>
      data.popularRestaurants.filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.cuisineLabel.toLowerCase().includes(q) ||
          (r.locationLabel ?? '').toLowerCase().includes(q)
        );
      }),
    [data.popularRestaurants, q]
  );

  // Scoped dishes for active restaurant (or single restaurant)
  const activeFoods = useMemo(() => {
    const targetRestId = activeRestaurant?.id ?? (!isMultiRestaurant ? singleRestaurant?.id : null);
    if (!targetRestId) return [];
    const map = new Map<string, FoodCardData>();
    for (const f of [...data.bestSellingFoods, ...data.recommendedFoods, ...data.trendingFoods]) {
      if (f.restaurantId !== targetRestId) continue;
      if (!map.has(f.id)) map.set(f.id, f);
    }
    return Array.from(map.values()).filter((f) => {
      if (!q) return true;
      return f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q);
    });
  }, [data, activeRestaurant?.id, isMultiRestaurant, singleRestaurant?.id, q]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Bar with Delivery Location & Quick Actions */}
        <View style={styles.header}>
          <Pressable style={styles.addressBtn} onPress={() => router.push('/addresses')}>
            <View style={[styles.pinBadge, { backgroundColor: colors.primarySoft }]}>
              <MapPin size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Hello{user?.fullName ? `, ${user.fullName}` : ''} · Deliver to
              </Text>
              <View style={styles.rowCenter}>
                <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedAddress
                    ? `${selectedAddress.houseNumber}, ${selectedAddress.area}, ${selectedAddress.city}`
                    : 'Lahore · Select delivery address'}
                </Text>
                <ChevronDown size={16} color={colors.primary} />
              </View>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            <View style={{ position: 'relative' }}>
              <IconButton
                icon={<Bell size={20} color={colors.textPrimary} />}
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
              />
              {unreadNotifCount > 0 ? (
                <View style={styles.bellBadge} pointerEvents="none">
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push('/cart')}
              style={[styles.cartBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
            >
              <ShoppingCart size={18} color="#FFFFFF" />
              {cartCount > 0 ? <Text style={styles.cartBadge}>{cartCount}</Text> : null}
            </Pressable>
            <IconButton
              icon={<User size={20} color={colors.textPrimary} />}
              accessibilityLabel="Profile"
              onPress={() => router.push('/(tabs)/profile')}
            />
          </View>
        </View>

        {/* Active Kitchen Session Lock Banner (Shows Once Customer Picks a Restaurant) */}
        {activeRestaurant && isMultiRestaurant ? (
          <ActiveRestaurantBar
            restaurants={data.popularRestaurants}
            onSwitched={(next) => {
              router.push(`/restaurant/${next.id}`);
            }}
          />
        ) : null}

        {/* Brand Hero Banner */}
        <View style={[styles.heroBanner, { backgroundColor: colors.primary, borderRadius: radii.xl }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.heroTag}>
              <Sparkles size={12} color="#FFF" />
              <Text style={styles.heroTagText}>
                {activeRestaurant ? `Ordering from ${activeRestaurant.name}` : 'ZestRoute Multi-Kitchen SaaS'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              {activeRestaurant
                ? `${activeRestaurant.name} Kitchen`
                : isMultiRestaurant
                  ? 'Choose One Restaurant to Order'
                  : `${singleRestaurant?.name ?? 'Fresh Kitchen'} Menu`}
            </Text>
            <Text style={styles.heroSub}>
              {activeRestaurant
                ? 'Your menu & Explore tab are locked to this kitchen. Switch anytime with 1 tap.'
                : isMultiRestaurant
                  ? 'Pick your favorite restaurant below — only its food will appear while ordering.'
                  : `${singleRestaurant?.locationLabel ?? 'Lahore'} · Delivered hot in 20–30 mins`}
            </Text>
          </View>
          <View style={styles.heroIcon}>
            <Flame size={28} color="#FFFFFF" />
          </View>
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={
            activeRestaurant
              ? `Search ${activeRestaurant.name} dishes...`
              : isMultiRestaurant
                ? 'Search restaurants (Pizza Box, Cheezious...)'
                : 'Search burgers, pizza, drinks...'
          }
        />

        {isLoading ? (
          <View style={{ gap: 16 }}>
            <LoadingSkeleton height={180} />
            <LoadingSkeleton height={180} />
          </View>
        ) : isError ? (
          <ErrorState message="Could not load restaurants." onRetry={() => void refetch()} />
        ) : isMultiRestaurant ? (
          <>
            {/* If a Restaurant is Active, Show Quick-Order Popular Dishes ONLY from That Restaurant */}
            {activeRestaurant && activeFoods.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Popular at {activeRestaurant.name}
                  </Text>
                  <Pressable
                    onPress={() => router.push(`/restaurant/${activeRestaurant.id}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Full Menu</Text>
                    <ArrowRight size={14} color={colors.primary} />
                  </Pressable>
                </View>
                {activeFoods.slice(0, 4).map((food) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    isFavorite={favFoodIds.has(food.id)}
                    onToggleFavorite={() => void toggleFavorite('food', food.id)}
                    onPress={() => router.push(`/food/${food.id}`)}
                    onAdd={() => handleQuickAdd(food)}
                  />
                ))}
              </View>
            ) : null}

            {/* Available SaaS Restaurants List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Store size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {activeRestaurant ? 'All Partner Kitchens' : 'Choose Your Restaurant'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  {filteredRestaurants.length} kitchens
                </Text>
              </View>

              {filteredRestaurants.length === 0 ? (
                <EmptyState
                  title="No matching restaurants"
                  description="Try clearing your search to see all available restaurants."
                  actionLabel="Show All Restaurants"
                  onAction={() => setSearch('')}
                />
              ) : (
                filteredRestaurants.map((rest) => {
                  const isActive = activeRestaurant?.id === rest.id;
                  return (
                    <View
                      key={rest.id}
                      style={[
                        isActive && {
                          borderWidth: 2,
                          borderColor: colors.primary,
                          borderRadius: radii.xl,
                          padding: 4,
                          backgroundColor: colors.primarySoft,
                        },
                      ]}
                    >
                      {isActive ? (
                        <View style={styles.activeTagRow}>
                          <CheckCircle2 size={14} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                            ACTIVE KITCHEN · TAP TO VIEW MENU
                          </Text>
                        </View>
                      ) : null}
                      <RestaurantCard
                        restaurant={rest}
                        isFavorite={favRestIds.has(rest.id)}
                        onToggleFavorite={() => void toggleFavorite('restaurant', rest.id)}
                        onPress={() => handleRestaurantPress(rest)}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          /* Single-Restaurant Mode: Direct Food Menu */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Our Food Menu</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                {activeFoods.length} items
              </Text>
            </View>
            {activeFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                isFavorite={favFoodIds.has(food.id)}
                onToggleFavorite={() => void toggleFavorite('food', food.id)}
                onPress={() => router.push(`/food/${food.id}`)}
                onAdd={() => handleQuickAdd(food)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Single-Restaurant Switch Guard Dialog */}
      <ConfirmationDialog
        visible={Boolean(pendingRestSwitch)}
        title={`Switch to ${pendingRestSwitch?.name ?? 'Kitchen'}?`}
        message={`You can only order from one restaurant at a time. Switching to ${pendingRestSwitch?.name ?? 'this restaurant'} will clear your current ${cartRestaurantName ?? activeRestaurant?.name ?? ''} cart (${cartCount} item${cartCount > 1 ? 's' : ''}).`}
        onConfirm={handleConfirmSwitchAndOpen}
        onCancel={() => setPendingRestSwitch(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  addressBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBtn: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartBadge: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  heroBanner: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#FFF0E3', fontSize: 12, fontWeight: '600' },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  activeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
