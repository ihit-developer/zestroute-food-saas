import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Heart, MapPin, ShoppingCart, Star } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FoodCard,
  IconButton,
  LoadingSkeleton,
  SearchBar,
  StatusBadge,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { useFavorites } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

interface RestaurantDetailPayload {
  restaurant: {
    _id: string;
    name: string;
    description?: string;
    cuisineTypes: string[];
    coverUrl?: string;
    logoUrl?: string;
    ratingAvg: number;
    ratingCount: number;
  };
  branches: Array<{
    _id: string;
    name: string;
    address: string;
    city: string;
    area: string;
    prepTimeMins?: number;
    deliveryFeeMinor?: number;
  }>;
  categories: Array<{ _id: string; name: string }>;
  foods: Array<{
    _id: string;
    restaurantId: string;
    restaurantCategoryId?: string;
    name: string;
    description?: string;
    regularPriceMinor: number;
    discountPriceMinor?: number;
    prepTimeMins?: number;
    isAvailable: boolean;
    imageUrl?: string;
  }>;
  reviews: Array<{
    _id: string;
    restaurantRating: number;
    comment?: string;
    ownerReply?: string;
  }>;
}

export default function RestaurantDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const addToCart = useAppStore((s) => s.addToCart);
  const selectRestaurantCart = useAppStore((s) => s.selectRestaurantCart);
  const setActiveRestaurant = useAppStore((s) => s.setActiveRestaurant);
  const cartItems = useAppStore((s) => s.cartItems);
  const cartRestaurantId = useAppStore((s) => s.cartRestaurantId);
  const cartRestaurantName = useAppStore((s) => s.cartRestaurantName);
  const pendingSwitch = useAppStore((s) => s.pendingRestaurantSwitch);
  const confirmReplaceCart = useAppStore((s) => s.confirmReplaceCart);
  const cancelReplaceCart = useAppStore((s) => s.cancelReplaceCart);
  const restaurantCart = useAppStore((s) => (id ? s.cartsByRestaurant[id] : undefined));

  const [tab, setTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<RestaurantDetailPayload>({
    queryKey: ['customer', 'restaurant', id],
    enabled: Boolean(id),
    refetchInterval: 8000,
    queryFn: () => httpClient.get<RestaurantDetailPayload>(`/catalog/restaurants/${id}`, true),
  });
  const { data: favData } = useFavorites();

  // Lock this restaurant as the customer's active kitchen if their cart is empty or already belongs to it
  useEffect(() => {
    if (!data?.restaurant) return;
    if (cartItems.length === 0 || cartRestaurantId === data.restaurant._id) {
      const primaryBranch = data.branches?.[0];
      setActiveRestaurant({
        id: data.restaurant._id,
        name: data.restaurant.name,
        cuisineLabel: data.restaurant.cuisineTypes.join(' · '),
        locationLabel: primaryBranch ? `${primaryBranch.area}, ${primaryBranch.city}` : 'Lahore',
      });
    }
  }, [data, cartItems.length, cartRestaurantId, setActiveRestaurant]);

  const isRestFav = useMemo(() => favData.restaurants.some((r) => r.id === id), [favData.restaurants, id]);
  const favFoodIds = useMemo(() => new Set(favData.foods.map((f) => f.id)), [favData.foods]);

  const toggleFavorite = async (targetType: 'restaurant' | 'food', targetId: string) => {
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

  const branch = data?.branches?.[0];
  const filteredFoods = (data?.foods ?? []).filter((f) => {
    if (selectedCatId && String(f.restaurantCategoryId ?? '') !== selectedCatId) return false;
    const q = menuSearch.trim().toLowerCase();
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q);
  });

  const cartItemCount = (restaurantCart?.items ?? []).reduce((s, i) => s + i.quantity, 0);
  const cartTotalMinor = (restaurantCart?.items ?? []).reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={data?.restaurant.name ?? 'Restaurant Menu'}
        subtitle={branch ? `${branch.area}, ${branch.city}` : ''}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          id ? (
            <IconButton
              icon={
                <Heart
                  size={18}
                  color={isRestFav ? colors.error : colors.textPrimary}
                  fill={isRestFav ? colors.error : 'none'}
                />
              }
              accessibilityLabel="Favorite restaurant"
              onPress={() => void toggleFavorite('restaurant', id)}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.scroll, cartItemCount > 0 && { paddingBottom: 96 }]} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingSkeleton height={220} />
        ) : isError || !data ? (
          <ErrorState message="Could not load restaurant menu." onRetry={() => void refetch()} />
        ) : (
          <>
            {/* Cover Banner */}
            <View style={[styles.cover, { backgroundColor: colors.skeletonBase, borderRadius: radii.xl }]}>
              {data.restaurant.coverUrl ? (
                <Image source={{ uri: data.restaurant.coverUrl }} style={{ width: '100%', height: '100%' }} />
              ) : null}
              <View style={styles.coverBadge}>
                <StatusBadge label="Available Now" tone="success" />
              </View>
            </View>

            {/* Restaurant Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{data.restaurant.name}</Text>
                <View style={[styles.ratingPill, { backgroundColor: colors.primarySoft }]}>
                  <Star size={13} color={colors.accent} fill={colors.accent} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                    {data.restaurant.ratingAvg.toFixed(1)} ({data.restaurant.ratingCount})
                  </Text>
                </View>
              </View>
              {data.restaurant.description ? (
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                  {data.restaurant.description}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {branch?.prepTimeMins ? `${branch.prepTimeMins}-${branch.prepTimeMins + 10} mins` : '20-30 mins'}
                  </Text>
                </View>
                {branch ? (
                  <View style={styles.metaChip}>
                    <MapPin size={14} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {branch.area}, {branch.city}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Tabs */}
            <Tabs
              items={[
                { key: 'menu', label: `Food Menu (${data.foods.length})` },
                { key: 'reviews', label: `Reviews (${data.reviews.length})` },
                { key: 'info', label: 'Info' },
              ]}
              activeKey={tab}
              onChange={(k) => setTab(k as 'menu' | 'reviews' | 'info')}
            />

            {tab === 'menu' ? (
              <>
                <SearchBar
                  value={menuSearch}
                  onChangeText={setMenuSearch}
                  placeholder={`Search dishes in ${data.restaurant.name}...`}
                />

                {/* Restaurant's Own Menu Category Pills */}
                {data.categories.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <Pressable
                      onPress={() => setSelectedCatId(null)}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: selectedCatId === null ? colors.primary : colors.surface,
                          borderColor: selectedCatId === null ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selectedCatId === null ? '#fff' : colors.textPrimary }}>
                        All ({data.foods.length})
                      </Text>
                    </Pressable>
                    {data.categories.map((cat) => {
                      const active = selectedCatId === cat._id;
                      return (
                        <Pressable
                          key={cat._id}
                          onPress={() => setSelectedCatId(active ? null : cat._id)}
                          style={[
                            styles.catPill,
                            {
                              backgroundColor: active ? colors.primary : colors.surface,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textPrimary }}>
                            {cat.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                {filteredFoods.length === 0 ? (
                  <EmptyState
                    title="No matching dishes"
                    description="Try clearing your search or selecting All categories."
                    actionLabel="Show All Dishes"
                    onAction={() => {
                      setMenuSearch('');
                      setSelectedCatId(null);
                    }}
                  />
                ) : (
                  filteredFoods.map((food) => (
                    <FoodCard
                      key={food._id}
                      food={{
                        id: food._id,
                        restaurantId: food.restaurantId,
                        restaurantName: data.restaurant.name,
                        name: food.name,
                        description: food.description,
                        imageUrl: food.imageUrl,
                        regularPriceMinor: food.regularPriceMinor,
                        discountPriceMinor: food.discountPriceMinor,
                        prepTimeMins: food.prepTimeMins,
                        isAvailable: food.isAvailable,
                      }}
                      isFavorite={favFoodIds.has(food._id)}
                      onToggleFavorite={() => void toggleFavorite('food', food._id)}
                      onPress={() => router.push(`/food/${food._id}`)}
                      onAdd={() => {
                        const status = addToCart(data.restaurant._id, data.restaurant.name, {
                          id: `${food._id}-base`,
                          foodId: food._id,
                          name: food.name,
                          unitPriceMinor: food.discountPriceMinor ?? food.regularPriceMinor,
                          quantity: 1,
                          customizations: [],
                        });
                        if (status === 'added') {
                          showToast(`${food.name} added to cart`, 'success');
                        }
                      }}
                    />
                  ))
                )}
              </>
            ) : null}

            {tab === 'reviews' ? (
              data.reviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Be the first customer to review this restaurant!" />
              ) : (
                data.reviews.map((rev) => (
                  <View
                    key={rev._id}
                    style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}
                  >
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      ★ {rev.restaurantRating.toFixed(1)} / 5
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{rev.comment || 'Great food!'}</Text>
                    {rev.ownerReply ? (
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                        Reply: {rev.ownerReply}
                      </Text>
                    ) : null}
                  </View>
                ))
              )
            ) : null}

            {tab === 'info' ? (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Kitchen Location</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {branch ? `${branch.name} — ${branch.address}, ${branch.area}, ${branch.city}` : 'Lahore'}
                </Text>
                <Text style={{ fontWeight: '700', color: colors.textPrimary, marginTop: 6 }}>Cuisines</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {data.restaurant.cuisineTypes.join(' · ')}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom View Cart Bar for This Restaurant */}
      {cartItemCount > 0 && id ? (
        <View style={[styles.stickyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              selectRestaurantCart(id);
              router.push('/cart');
            }}
            style={[styles.stickyBtn, { backgroundColor: colors.primary, borderRadius: radii.lg }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} color="#FFFFFF" />
              <Text style={styles.stickyText}>
                View Cart ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'})
              </Text>
            </View>
            <Text style={styles.stickyText}>{formatMoney(cartTotalMinor)}</Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmationDialog
        visible={Boolean(pendingSwitch)}
        title={`Switch to ${pendingSwitch?.restaurantName ?? 'Kitchen'}?`}
        message={`You can only order from one restaurant at a time. Adding this item will replace your current ${cartRestaurantName ?? 'previous'} cart.`}
        onConfirm={() => {
          confirmReplaceCart();
          showToast('Cart switched to this restaurant', 'success');
        }}
        onCancel={cancelReplaceCart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 36 },
  cover: { height: 185, overflow: 'hidden', position: 'relative' },
  coverBadge: { position: 'absolute', top: 12, left: 12 },
  infoCard: { padding: 16, borderWidth: 1, gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', flex: 1 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 2 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  stickyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, borderTopWidth: 1 },
  stickyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
