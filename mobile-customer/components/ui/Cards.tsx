import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, Heart, MapPin, Plus, Star, Utensils } from 'lucide-react-native';
import {
  formatMoney,
  type CategoryCardData,
  type FoodCardData,
  type RestaurantCardData,
} from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { DiscountBadge, StatusBadge } from './Badges';
import { PrimaryButton } from './Button';

export const CategoryCard: React.FC<{
  category: CategoryCardData;
  selected?: boolean;
  onPress?: () => void;
}> = ({ category, selected = false, onPress }) => {
  const { colors, radii, shadows } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.categoryCard,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.lg,
        },
        shadows.sm.native,
      ]}
    >
      <View style={[styles.catAvatar, { backgroundColor: colors.surfaceElevated }]}>
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={styles.fullImg} />
        ) : (
          <Utensils size={20} color={colors.primary} />
        )}
      </View>
      <Text
        style={[
          styles.catLabel,
          { color: selected ? colors.primary : colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
};

export const RestaurantCard: React.FC<{
  restaurant: RestaurantCardData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}> = ({ restaurant, isFavorite = false, onToggleFavorite, onPress }) => {
  const { colors, radii, shadows, strings } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
        shadows.sm.native,
      ]}
    >
      <View style={[styles.coverBox, { backgroundColor: colors.skeletonBase }]}>
        {restaurant.coverUrl ? (
          <Image source={{ uri: restaurant.coverUrl }} style={styles.fullImg} />
        ) : (
          <Utensils size={28} color={colors.textSecondary} />
        )}
        <View style={styles.badgeOverlay}>
          <StatusBadge
            label={restaurant.isOpen ? 'Available' : 'Closed'}
            tone={restaurant.isOpen ? 'success' : 'error'}
          />
          {restaurant.discountBadgeText ? <DiscountBadge text={restaurant.discountBadgeText} /> : null}
        </View>
        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            style={styles.favCircle}
            hitSlop={8}
          >
            <Heart
              size={16}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
              fill={isFavorite ? '#EF4444' : 'transparent'}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={[styles.ratingPill, { backgroundColor: colors.primarySoft }]}>
            <Star size={12} fill={colors.accent} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
              {restaurant.rating.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.locRow}>
          <MapPin size={13} color={colors.primary} />
          <Text style={[styles.locText, { color: colors.textSecondary }]} numberOfLines={1}>
            {restaurant.locationLabel ?? 'Lahore'} · {restaurant.cuisineLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Clock size={13} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {restaurant.deliveryTimeLabel}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.primary, fontWeight: '600' }]}>
            {restaurant.deliveryFeeMinor === 0
              ? strings.freeDelivery
              : `Delivery ${formatMoney(restaurant.deliveryFeeMinor)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export const FoodCard: React.FC<{
  food: FoodCardData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
  onAdd?: () => void;
}> = ({ food, isFavorite = false, onToggleFavorite, onPress, onAdd }) => {
  const { colors, radii, shadows } = useTheme();
  const effectivePrice = food.discountPriceMinor ?? food.regularPriceMinor;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.foodCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          opacity: food.isAvailable ? 1 : 0.72,
        },
        shadows.sm.native,
      ]}
    >
      <View style={[styles.foodThumb, { backgroundColor: colors.skeletonBase, borderRadius: radii.md }]}>
        {food.imageUrl ? (
          <Image source={{ uri: food.imageUrl }} style={styles.fullImg} />
        ) : (
          <Utensils size={24} color={colors.textSecondary} />
        )}
        <View
          style={[
            styles.availDot,
            { backgroundColor: food.isAvailable ? '#16A34A' : '#DC2626' },
          ]}
        >
          <Text style={styles.availDotText}>
            {food.isAvailable ? 'Available' : 'Sold Out'}
          </Text>
        </View>
      </View>

      <View style={styles.foodInfo}>
        <View style={styles.rowBetween}>
          <Text style={[styles.restTag, { color: colors.primary }]} numberOfLines={1}>
            {food.restaurantName ?? 'Fresh Kitchen'}
            {food.prepTimeMins ? ` · ${food.prepTimeMins} min` : ''}
          </Text>
          {onToggleFavorite ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              hitSlop={8}
            >
              <Heart
                size={16}
                color={isFavorite ? '#EF4444' : colors.textSecondary}
                fill={isFavorite ? '#EF4444' : 'transparent'}
              />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {food.name}
        </Text>

        {food.description ? (
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={2}>
            {food.description}
          </Text>
        ) : null}

        <View style={[styles.rowBetween, { marginTop: 4 }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>{formatMoney(effectivePrice)}</Text>
            {food.discountPriceMinor ? (
              <Text style={[styles.strike, { color: colors.textSecondary }]}>
                {formatMoney(food.regularPriceMinor)}
              </Text>
            ) : null}
          </View>
          {onAdd ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onAdd();
              }}
              disabled={!food.isAvailable}
              style={[
                styles.addPill,
                { backgroundColor: food.isAvailable ? colors.primary : colors.border },
              ]}
            >
              <Plus size={14} color={colors.textOnPrimary} />
              <Text style={[styles.addPillText, { color: colors.textOnPrimary }]}>
                {food.isAvailable ? 'Add' : 'N/A'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

export const ProductDetailCard: React.FC<{
  food: FoodCardData;
  onAddToCart?: () => void;
}> = ({ food, onAddToCart }) => {
  const { colors, radii, shadows, strings } = useTheme();
  const effectivePrice = food.discountPriceMinor ?? food.regularPriceMinor;
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
        shadows.sm.native,
      ]}
    >
      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{food.name}</Text>
      {food.description ? (
        <Text style={[styles.sub, { color: colors.textSecondary }]}>{food.description}</Text>
      ) : null}
      <View style={styles.rowBetween}>
        <Text style={[styles.detailPrice, { color: colors.primary }]}>{formatMoney(effectivePrice)}</Text>
        <PrimaryButton title={strings.addToCart} disabled={!food.isAvailable} onPress={onAddToCart} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryCard: { width: 92, padding: 10, borderWidth: 1, alignItems: 'center', gap: 8 },
  catAvatar: { width: 46, height: 46, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catLabel: { fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, overflow: 'hidden' },
  coverBox: { height: 154, alignItems: 'center', justifyContent: 'center' },
  fullImg: { width: '100%', height: '100%' },
  badgeOverlay: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  favCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '700' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locText: { fontSize: 12, flex: 1 },
  sub: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 12 },
  foodCard: { padding: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  foodThumb: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  availDot: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availDotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  foodInfo: { flex: 1, gap: 4 },
  restTag: { fontSize: 11, fontWeight: '700', flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 16, fontWeight: '800' },
  strike: { fontSize: 12, textDecorationLine: 'line-through' },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addPillText: { fontSize: 12, fontWeight: '700' },
  detailCard: { padding: 16, borderWidth: 1, gap: 10 },
  detailTitle: { fontSize: 20, fontWeight: '700' },
  detailPrice: { fontSize: 20, fontWeight: '700' },
});
