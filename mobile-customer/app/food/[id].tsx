import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  ErrorState,
  IconButton,
  InputField,
  LoadingSkeleton,
  PrimaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../components/ui';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

interface FoodDetailPayload {
  food: {
    _id: string;
    restaurantId: string;
    name: string;
    description?: string;
    ingredients: string[];
    regularPriceMinor: number;
    discountPriceMinor?: number;
    prepTimeMins: number;
    isAvailable: boolean;
  };
  images: Array<{ _id: string; url: string }>;
  variants: Array<{ _id: string; name: string; priceDeltaMinor: number }>;
}

export default function FoodDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const addToCart = useAppStore((s) => s.addToCart);
  const activeRestaurant = useAppStore((s) => s.activeRestaurant);
  const pendingSwitch = useAppStore((s) => s.pendingRestaurantSwitch);
  const confirmReplaceCart = useAppStore((s) => s.confirmReplaceCart);
  const cancelReplaceCart = useAppStore((s) => s.cancelReplaceCart);

  const { data, isLoading, isError, refetch } = useQuery<FoodDetailPayload>({
    queryKey: ['customer', 'food', id],
    enabled: Boolean(id),
    queryFn: () => httpClient.get<FoodDetailPayload>(`/catalog/foods/${id}`, true),
  });

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  const basePriceMinor = data?.food.discountPriceMinor ?? data?.food.regularPriceMinor ?? 0;
  const variants = data?.variants ?? [];

  const finalUnitMinor = useMemo(() => {
    const vDelta = variants.find((v) => v._id === selectedVariant)?.priceDeltaMinor ?? 0;
    return basePriceMinor + vDelta;
  }, [basePriceMinor, selectedVariant, variants]);

  const handleAdd = () => {
    if (!data) return;
    const restName =
      activeRestaurant?.id === data.food.restaurantId
        ? activeRestaurant.name
        : 'Selected Restaurant';
    const status = addToCart(data.food.restaurantId, restName, {
      id: `${data.food._id}-${Date.now()}`,
      foodId: data.food._id,
      name: data.food.name,
      variantId: selectedVariant ?? undefined,
      unitPriceMinor: finalUnitMinor,
      quantity,
      customizations: [],
      specialInstructions: instructions.trim() || undefined,
    });
    if (status === 'added') {
      showToast(`${data.food.name} added to cart`, 'success');
      router.push('/cart');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={data?.food.name ?? 'Food Details'}
        subtitle="Customize your meal"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <LoadingSkeleton height={240} />
        ) : isError || !data ? (
          <ErrorState message="Could not load food item details." onRetry={() => refetch()} />
        ) : (
          <>
            <View style={[styles.gallery, { backgroundColor: colors.skeletonBase, borderRadius: radii.lg }]}>
              {data.images[0]?.url ? (
                <Image source={{ uri: data.images[0].url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <StatusBadge label={`${data.food.prepTimeMins} mins prep`} tone="info" />
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{data.food.name}</Text>
              {data.food.description && (
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{data.food.description}</Text>
              )}
              {data.food.ingredients.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {data.food.ingredients.map((ing) => (
                    <StatusBadge key={ing} label={ing} tone="neutral" />
                  ))}
                </View>
              )}
            </View>

            {variants.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Select Size / Variant</Text>
                {variants.map((v) => {
                  const active = selectedVariant === v._id;
                  return (
                    <Pressable
                      key={v._id}
                      onPress={() => setSelectedVariant(v._id)}
                      style={[
                        styles.variantRow,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primarySoft : colors.surfaceElevated,
                          borderRadius: radii.md,
                        },
                      ]}
                    >
                      <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{v.name}</Text>
                      <Text style={{ fontWeight: '700', color: colors.primary }}>
                        +{formatMoney(v.priceDeltaMinor)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <InputField
              label="Special Instructions (Optional)"
              placeholder="e.g., Less spicy, no onions, extra napkins..."
              value={instructions}
              onChangeText={setInstructions}
            />

            <View style={styles.qtyRow}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Quantity</Text>
              <View style={styles.qtyControls}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Minus size={16} color={colors.textPrimary} />
                </Pressable>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 28, textAlign: 'center' }}>
                  {quantity}
                </Text>
                <Pressable
                  onPress={() => setQuantity((q) => q + 1)}
                  style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                >
                  <Plus size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Calculated Total</Text>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.primary }}>
            {formatMoney(finalUnitMinor * quantity)}
          </Text>
        </View>
        <PrimaryButton title="Add to Cart" disabled={!data?.food.isAvailable} onPress={handleAdd} />
      </View>

      <ConfirmationDialog
        visible={Boolean(pendingSwitch)}
        title="Replace Existing Cart?"
        message="Your cart currently has items from another restaurant. Replace it with this item?"
        onCancel={cancelReplaceCart}
        onConfirm={() => {
          confirmReplaceCart();
          router.push('/cart');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  gallery: { height: 210, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  variantRow: { padding: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
