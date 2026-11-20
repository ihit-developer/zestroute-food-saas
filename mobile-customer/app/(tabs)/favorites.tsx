import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react-native';
import type { FoodCardData } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  ErrorState,
  FoodCard,
  IconButton,
  LoadingSkeleton,
  RestaurantCard,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { useFavorites } from '../../hooks/useCustomerData';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const addToCart = useAppStore((s) => s.addToCart);
  const [tab, setTab] = useState<'foods' | 'restaurants' | 'recent'>('foods');
  const { data, isLoading, isError, refetch } = useFavorites();

  const toggleFavorite = async (targetType: 'restaurant' | 'food', targetId: string) => {
    try {
      await httpClient.post('/favorites/toggle', { targetType, targetId });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'favorites'] });
      showToast('Removed from favorites', 'info');
    } catch {
      showToast('Unable to update favorite', 'error');
    }
  };

  const handleQuickAdd = (food: FoodCardData) => {
    const result = addToCart(food.restaurantId, food.restaurantName ?? 'Restaurant', {
      id: `${food.id}-base`,
      foodId: food.id,
      name: food.name,
      unitPriceMinor: food.discountPriceMinor ?? food.regularPriceMinor,
      quantity: 1,
      customizations: [],
    });
    if (result === 'added') {
      showToast(`${food.name} added to cart`, 'success');
    } else {
      router.push(`/food/${food.id}`);
    }
  };

  const items =
    tab === 'restaurants' ? data.restaurants : tab === 'foods' ? data.foods : data.recent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Favorites"
        subtitle="Saved dishes & restaurants"
        rightAction={
          <IconButton
            icon={<RefreshCw size={18} color={colors.textPrimary} />}
            accessibilityLabel="Refresh favorites"
            onPress={() => void refetch()}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Tabs
          items={[
            { key: 'foods', label: `Dishes (${data.foods.length})` },
            { key: 'restaurants', label: `Restaurants (${data.restaurants.length})` },
            { key: 'recent', label: `Recent (${data.recent.length})` },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as 'foods' | 'restaurants' | 'recent')}
        />

        {!isAuthenticated ? (
          <EmptyState
            title="Sign in to view favorites"
            description="Save your favorite dishes and restaurants for instant reordering."
            actionLabel="Sign In"
            onAction={() => router.push('/(auth)/login')}
          />
        ) : isLoading ? (
          <LoadingSkeleton height={130} />
        ) : isError ? (
          <ErrorState message="Could not load favorites." onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No saved items yet"
            description="Tap the heart icon on any dish or restaurant to save it here."
            actionLabel="Explore Food Menu"
            onAction={() => router.push('/(tabs)/home')}
          />
        ) : tab === 'restaurants' ? (
          data.restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              isFavorite
              onToggleFavorite={() => void toggleFavorite('restaurant', r.id)}
              onPress={() => router.push(`/restaurant/${r.id}`)}
            />
          ))
        ) : (
          (tab === 'foods' ? data.foods : data.recent).map((f) => (
            <FoodCard
              key={f.id}
              food={f}
              isFavorite={tab === 'foods'}
              onToggleFavorite={tab === 'foods' ? () => void toggleFavorite('food', f.id) : undefined}
              onPress={() => router.push(`/food/${f.id}`)}
              onAdd={() => handleQuickAdd(f)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
});
