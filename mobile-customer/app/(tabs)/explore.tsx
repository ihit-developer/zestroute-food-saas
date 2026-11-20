import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, SlidersHorizontal, Star, Store } from 'lucide-react-native';
import type { FoodCardData, RestaurantCardData } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  BottomSheet,
  CategoryCard,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FoodCard,
  IconButton,
  LoadingSkeleton,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { ActiveRestaurantBar } from '../../components/ActiveRestaurantBar';
import { useFavorites, useHomeFeed } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; search?: string; restaurantId?: string }>();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const activeRestaurant = useAppStore((s) => s.activeRestaurant);
  const setActiveRestaurant = useAppStore((s) => s.setActiveRestaurant);
  const addToCart = useAppStore((s) => s.addToCart);
  const pendingSwitch = useAppStore((s) => s.pendingRestaurantSwitch);
  const confirmReplaceCart = useAppStore((s) => s.confirmReplaceCart);
  const cancelReplaceCart = useAppStore((s) => s.cancelReplaceCart);
  const cartRestaurantName = useAppStore((s) => s.cartRestaurantName);

  const [search, setSearch] = useState(params.search ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category ?? null);
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'deals' | 'spicy' | 'veg' | 'combo' | 'cheese'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price_low' | 'price_high' | 'fastest'>('popular');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [onlyDiscount, setOnlyDiscount] = useState(false);

  const lockedRestaurantId = activeRestaurant?.id ?? null;

  const { data: homeData, isLoading, isError, refetch } = useHomeFeed(lockedRestaurantId);
  const { data: favData } = useFavorites();
  const favFoodIds = useMemo(() => new Set(favData.foods.map((f) => f.id)), [favData.foods]);

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category);
    if (params.search) setSearch(params.search);
    if (params.restaurantId && !activeRestaurant) {
      const match = homeData.popularRestaurants.find((r) => r.id === params.restaurantId);
      if (match) {
        setActiveRestaurant({
          id: match.id,
          name: match.name,
          cuisineLabel: match.cuisineLabel,
          locationLabel: match.locationLabel,
        });
      }
    }
  }, [params.category, params.search, params.restaurantId, activeRestaurant, homeData.popularRestaurants, setActiveRestaurant]);

  // Auto-select if there is only 1 restaurant in the entire platform
  useEffect(() => {
    if (!activeRestaurant && homeData.popularRestaurants.length === 1) {
      const only = homeData.popularRestaurants[0];
      setActiveRestaurant({
        id: only.id,
        name: only.name,
        cuisineLabel: only.cuisineLabel,
        locationLabel: only.locationLabel,
      });
    }
  }, [activeRestaurant, homeData.popularRestaurants, setActiveRestaurant]);

  const toggleFavorite = async (foodId: string) => {
    if (!isAuthenticated) {
      showToast('Please sign in to save favorites', 'info');
      router.push('/(auth)/login');
      return;
    }
    try {
      await httpClient.post('/favorites/toggle', { targetType: 'food', targetId: foodId });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'favorites'] });
      showToast('Favorites updated', 'success');
    } catch {
      showToast('Unable to update favorite', 'error');
    }
  };

  const handleSelectInitialRestaurant = (rest: RestaurantCardData) => {
    setActiveRestaurant({
      id: rest.id,
      name: rest.name,
      cuisineLabel: rest.cuisineLabel,
      locationLabel: rest.locationLabel,
    });
    setSelectedCategory(null);
    showToast(`Now exploring ${rest.name} menu`, 'success');
  };

  const handleQuickAdd = (food: FoodCardData) => {
    const restName = food.restaurantName ?? activeRestaurant?.name ?? 'Restaurant';
    const status = addToCart(food.restaurantId, restName, {
      id: `${food.id}-base`,
      foodId: food.id,
      name: food.name,
      unitPriceMinor: food.discountPriceMinor ?? food.regularPriceMinor,
      quantity: 1,
      customizations: [],
    });
    if (status === 'added') {
      showToast(`Added "${food.name}" to ${restName} cart`, 'success');
    }
  };

  // STRICT SINGLE-RESTAURANT SCOPING:
  // Once a restaurant is selected, ONLY dishes belonging to that restaurant are shown.
  const filteredFoods = useMemo(() => {
    if (!lockedRestaurantId) return [];

    const map = new Map<string, FoodCardData>();
    for (const f of [...homeData.bestSellingFoods, ...homeData.recommendedFoods, ...homeData.trendingFoods]) {
      if (f.restaurantId !== lockedRestaurantId) continue;
      if (!map.has(f.id)) map.set(f.id, f);
    }

    const q = search.trim().toLowerCase();
    const cat = selectedCategory?.toLowerCase() ?? '';
    const list = Array.from(map.values()).filter((f) => {
      if (onlyAvailable && !f.isAvailable) return false;
      if (onlyDiscount && !f.discountPriceMinor) return false;
      const hay = `${f.name} ${f.description ?? ''}`.toLowerCase();
      if (dietaryFilter === 'deals' && !f.discountPriceMinor && !hay.includes('deal') && !hay.includes('box') && !hay.includes('platter')) {
        return false;
      }
      if (dietaryFilter === 'spicy' && !hay.includes('spicy') && !hay.includes('tikka') && !hay.includes('peri') && !hay.includes('fajita') && !hay.includes('jalapeno') && !hay.includes('hot')) {
        return false;
      }
      if (dietaryFilter === 'veg' && (hay.includes('chicken') || hay.includes('beef') || hay.includes('pepperoni') || hay.includes('meat') || hay.includes('wings') || hay.includes('zinger'))) {
        return false;
      }
      if (dietaryFilter === 'combo' && !hay.includes('deal') && !hay.includes('combo') && !hay.includes('platter') && !hay.includes('box') && !hay.includes('family')) {
        return false;
      }
      if (dietaryFilter === 'cheese' && !hay.includes('cheese') && !hay.includes('cheez') && !hay.includes('crown') && !hay.includes('stuffed') && !hay.includes('pasta')) {
        return false;
      }
      if (q && !f.name.toLowerCase().includes(q) && !(f.description ?? '').toLowerCase().includes(q)) {
        return false;
      }
      if (cat && !f.name.toLowerCase().includes(cat) && !(f.description ?? '').toLowerCase().includes(cat)) {
        return false;
      }
      return true;
    });

    if (sortBy === 'price_low') {
      return list.sort((a, b) => (a.discountPriceMinor ?? a.regularPriceMinor) - (b.discountPriceMinor ?? b.regularPriceMinor));
    }
    if (sortBy === 'price_high') {
      return list.sort((a, b) => (b.discountPriceMinor ?? b.regularPriceMinor) - (a.discountPriceMinor ?? a.regularPriceMinor));
    }
    if (sortBy === 'fastest') {
      return list.sort((a, b) => (a.prepTimeMins ?? 15) - (b.prepTimeMins ?? 15));
    }
    return list;
  }, [homeData, lockedRestaurantId, search, selectedCategory, dietaryFilter, onlyAvailable, onlyDiscount, sortBy]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={activeRestaurant ? `${activeRestaurant.name} Menu` : 'Explore Menu'}
        subtitle={
          activeRestaurant
            ? 'Showing only items from your active kitchen'
            : 'Choose a restaurant first to browse its menu'
        }
        rightAction={
          activeRestaurant ? (
            <IconButton
              icon={<SlidersHorizontal size={18} color={colors.textPrimary} />}
              accessibilityLabel="Open filters"
              onPress={() => setFilterSheetOpen(true)}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <LoadingSkeleton height={72} />
            <LoadingSkeleton height={140} />
            <LoadingSkeleton height={140} />
          </View>
        ) : isError ? (
          <ErrorState message="Failed to load menu." onRetry={() => void refetch()} />
        ) : !activeRestaurant ? (
          /* No Restaurant Selected Yet → Ask User to Pick One Restaurant First */
          <View style={{ gap: 14 }}>
            <View
              style={[
                styles.pickerHero,
                { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.xl },
              ]}
            >
              <View style={[styles.pickerIcon, { backgroundColor: colors.primary }]}>
                <Store size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                Choose One Restaurant to Order
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                Select a kitchen below. Once selected, Explore will show only that restaurant's menu so your order stays clean and fast.
              </Text>
            </View>

            {homeData.popularRestaurants.map((rest) => (
              <Pressable
                key={rest.id}
                onPress={() => handleSelectInitialRestaurant(rest)}
                style={[
                  styles.restPickCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                    {rest.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {rest.cuisineLabel} · {rest.locationLabel ?? 'Lahore'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Star size={13} color={colors.accent} fill={colors.accent} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                        {rest.rating.toFixed(1)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {rest.deliveryTimeLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.openPill, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Select</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          /* Restaurant Locked → Strictly Scoped Menu for Active Restaurant Only */
          <>
            <ActiveRestaurantBar
              restaurants={homeData.popularRestaurants}
              onSwitched={() => {
                setSelectedCategory(null);
                setSearch('');
              }}
            />

            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={`Search dishes in ${activeRestaurant.name}...`}
            />

            {/* Dietary & Combo Deals Quick Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(
                [
                  { key: 'all', label: 'All Menu' },
                  { key: 'deals', label: '🔥 Deals' },
                  { key: 'spicy', label: '🌶️ Spicy' },
                  { key: 'cheese', label: '🧀 Cheesy' },
                  { key: 'combo', label: '👨‍👩‍👧 Combos' },
                  { key: 'veg', label: '🥗 Veg' },
                ] as const
              ).map((chip) => {
                const active = dietaryFilter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setDietaryFilter(chip.key)}
                    style={{
                      paddingHorizontal: 13,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: active ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Categories Strip */}
            {homeData.categories.length > 0 ? (
              <View style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Categories</Text>
                  {selectedCategory ? (
                    <Text
                      onPress={() => setSelectedCategory(null)}
                      style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}
                    >
                      Clear ({selectedCategory})
                    </Text>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {homeData.categories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      selected={selectedCategory === cat.name}
                      onPress={() => setSelectedCategory((c) => (c === cat.name ? null : cat.name))}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Sort Tabs */}
            <Tabs
              items={[
                { key: 'popular', label: 'Popular' },
                { key: 'price_low', label: 'Price: Low' },
                { key: 'price_high', label: 'Price: High' },
                { key: 'fastest', label: 'Fastest' },
              ]}
              activeKey={sortBy}
              onChange={(k) => setSortBy(k as 'popular' | 'price_low' | 'price_high' | 'fastest')}
            />

            {/* Scoped Menu Results */}
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {selectedCategory ? `${selectedCategory} at ${activeRestaurant.name}` : `${activeRestaurant.name} Dishes`}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                {filteredFoods.length} items
              </Text>
            </View>

            {filteredFoods.length === 0 ? (
              <EmptyState
                title="No matching dishes"
                description={`No dishes found in ${activeRestaurant.name} for this filter.`}
                actionLabel="Reset Filters"
                onAction={() => {
                  setSearch('');
                  setSelectedCategory(null);
                  setOnlyDiscount(false);
                }}
              />
            ) : (
              filteredFoods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  isFavorite={favFoodIds.has(food.id)}
                  onToggleFavorite={() => void toggleFavorite(food.id)}
                  onPress={() => router.push(`/food/${food.id}`)}
                  onAdd={() => handleQuickAdd(food)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title="Filter Dishes">
        <View style={{ gap: 12 }}>
          <SecondaryButton
            title={onlyAvailable ? '✓ Available Dishes Only' : 'Include Unavailable Dishes'}
            onPress={() => setOnlyAvailable((v) => !v)}
          />
          <SecondaryButton
            title={onlyDiscount ? '✓ Discounted Deals Only' : 'Show Discounted Deals Only'}
            onPress={() => setOnlyDiscount((v) => !v)}
          />
          <PrimaryButton title="Apply Filters" onPress={() => setFilterSheetOpen(false)} />
        </View>
      </BottomSheet>

      <ConfirmationDialog
        visible={Boolean(pendingSwitch)}
        title={`Switch to ${pendingSwitch?.restaurantName ?? 'Kitchen'}?`}
        message={`Your cart currently has items from ${cartRestaurantName ?? 'another restaurant'}. Replace your cart to order from ${pendingSwitch?.restaurantName ?? 'this kitchen'}?`}
        onConfirm={() => {
          confirmReplaceCart();
          showToast('Cart switched to new restaurant', 'success');
        }}
        onCancel={cancelReplaceCart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 110 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  pickerHero: {
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  pickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  restPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    padding: 14,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
