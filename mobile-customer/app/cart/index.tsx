import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react-native';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  EmptyState,
  IconButton,
  InputField,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../components/ui';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

export default function CartScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const {
    cartRestaurantId,
    cartRestaurantName,
    cartItems,
    appliedCouponCode,
    appliedDiscountMinor,
    updateItemQty,
    removeItem,
    applyCoupon,
    clearCart,
  } = useAppStore();

  const [couponInput, setCouponInput] = useState(appliedCouponCode ?? '');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const subtotalMinor = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const customSum = item.customizations.reduce((c, a) => c + a.priceMinor * a.quantity, 0);
        return sum + (item.unitPriceMinor + customSum) * item.quantity;
      }, 0),
    [cartItems]
  );

  const totalQty = useMemo(() => cartItems.reduce((sum, i) => sum + i.quantity, 0), [cartItems]);

  const { data: restDetail } = useQuery<{
    branches?: Array<{ deliveryFeeMinor?: number; prepTimeMins?: number; area?: string }>;
  }>({
    queryKey: ['customer', 'restaurant-delivery-fee', cartRestaurantId],
    enabled: Boolean(cartRestaurantId),
    refetchInterval: 8000,
    queryFn: () =>
      httpClient.get<{ branches?: Array<{ deliveryFeeMinor?: number; prepTimeMins?: number; area?: string }> }>(
        `/catalog/restaurants/${cartRestaurantId}`,
        true
      ),
  });

  const primaryBranch = restDetail?.branches?.[0];
  const deliveryFeeMinor = primaryBranch?.deliveryFeeMinor ?? 12000;
  const prepMins = primaryBranch?.prepTimeMins ?? 25;
  const discountMinor = Math.min(subtotalMinor + deliveryFeeMinor, appliedDiscountMinor);
  const taxMinor = 0;
  const finalTotalMinor = Math.max(0, subtotalMinor - discountMinor + deliveryFeeMinor + taxMinor);

  const handleCouponAction = async () => {
    if (appliedCouponCode) {
      applyCoupon(null, 0);
      setCouponInput('');
      showToast('Coupon removed', 'info');
      return;
    }
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a coupon code', 'error');
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await httpClient.post<{
        code: string;
        discountMinor: number;
        message: string;
      }>('/coupons/validate', {
        code,
        subtotalMinor,
        restaurantId: cartRestaurantId ?? undefined,
      });
      applyCoupon(res.code, res.discountMinor);
      setCouponInput(res.code);
      showToast(`${res.message} (-${formatMoney(res.discountMinor)})`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Invalid or expired coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Your Cart"
        subtitle={
          totalQty > 0
            ? `${totalQty} item${totalQty > 1 ? 's' : ''} · ${cartRestaurantName ?? 'Kitchen'}`
            : 'Review your selected items'
        }
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          cartItems.length > 0 ? (
            <IconButton
              icon={<Trash2 size={17} color={colors.error} />}
              accessibilityLabel="Clear cart"
              onPress={() => setClearConfirmOpen(true)}
            />
          ) : undefined
        }
      />

      {/* Order Flow Progress Stepper */}
      {cartItems.length > 0 ? (
        <View style={[styles.stepBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {[
            { num: '1', label: 'Cart', active: true },
            { num: '2', label: 'Checkout', active: false },
            { num: '3', label: 'Track Live', active: false },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: s.active ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: s.active ? '#FFFFFF' : colors.textSecondary }}>
                    {s.num}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: s.active ? '800' : '600',
                    color: s.active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {s.label}
                </Text>
              </View>
              {idx < 2 ? <View style={[styles.stepLine, { backgroundColor: colors.border }]} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, cartItems.length > 0 && { paddingBottom: 112 }]}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.length === 0 ? (
          <View style={{ paddingTop: 28 }}>
            <EmptyState
              title="Your cart is empty"
              description="Pick a restaurant and add your favorite dishes to start an order."
              actionLabel="Browse Restaurants"
              onAction={() => router.replace('/(tabs)/home')}
            />
          </View>
        ) : (
          <>
            {/* Active Kitchen Summary Card */}
            <View
              style={[
                styles.kitchenCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderRadius: radii.xl,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.storeBadge, { backgroundColor: colors.primarySoft }]}>
                    <Store size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.4 }}>
                      ORDERING FROM
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                      {cartRestaurantName ?? 'Selected Kitchen'}
                    </Text>
                  </View>
                </View>
                <StatusBadge
                  label={deliveryFeeMinor === 0 ? 'FREE DELIVERY' : `${formatMoney(deliveryFeeMinor)} Delivery`}
                  tone={deliveryFeeMinor === 0 ? 'success' : 'info'}
                />
              </View>

              <View style={[styles.kitchenMetaRow, { borderTopColor: colors.border }]}>
                <View style={styles.metaChip}>
                  <Clock size={13} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                    Est. {prepMins}–{prepMins + 10} mins
                  </Text>
                </View>
                {cartRestaurantId ? (
                  <Pressable
                    onPress={() => router.push(`/restaurant/${cartRestaurantId}`)}
                    style={styles.addMoreLink}
                  >
                    <Plus size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
                      Add More Items
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Cart Items Section */}
            <View style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShoppingBag size={16} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                    Selected Items ({totalQty})
                  </Text>
                </View>
              </View>

              {cartItems.map((item) => {
                const customSum = item.customizations.reduce((c, a) => c + a.priceMinor * a.quantity, 0);
                const lineTotal = (item.unitPriceMinor + customSum) * item.quantity;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemCard,
                      { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                          {item.name}
                        </Text>
                        {item.variantName ? (
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            Variant: {item.variantName}
                          </Text>
                        ) : null}
                        {item.specialInstructions ? (
                          <Text style={{ fontSize: 11.5, color: colors.primary, fontStyle: 'italic' }}>
                            Note: {item.specialInstructions}
                          </Text>
                        ) : null}
                        <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>
                          {formatMoney(item.unitPriceMinor + customSum)} each
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                          {formatMoney(lineTotal)}
                        </Text>

                        {/* Modern Quantity Stepper Pill */}
                        <View
                          style={[
                            styles.qtyPill,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Pressable
                            hitSlop={8}
                            onPress={() =>
                              item.quantity <= 1 ? removeItem(item.id) : updateItemQty(item.id, -1)
                            }
                            style={styles.qtyBtn}
                          >
                            {item.quantity <= 1 ? (
                              <Trash2 size={14} color={colors.error} />
                            ) : (
                              <Minus size={14} color={colors.textPrimary} />
                            )}
                          </Pressable>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, minWidth: 22, textAlign: 'center' }}>
                            {item.quantity}
                          </Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => updateItemQty(item.id, 1)}
                            style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                          >
                            <Plus size={14} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Promo / Coupon Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Tag size={15} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                  Apply Promo / Coupon Code
                </Text>
              </View>
              <InputField
                placeholder="Enter code (e.g., WELCOME20)"
                value={couponInput}
                onChangeText={setCouponInput}
                rightElement={
                  <SecondaryButton
                    title={validatingCoupon ? '...' : appliedCouponCode ? 'Remove' : 'Apply'}
                    disabled={validatingCoupon}
                    onPress={() => void handleCouponAction()}
                  />
                }
              />
              {appliedCouponCode && discountMinor > 0 ? (
                <View style={[styles.savingsPill, { backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: radii.md }]}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                    ✓ Coupon {appliedCouponCode} applied — You save {formatMoney(discountMinor)}!
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Clear Bill Breakdown Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Receipt size={16} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  Order Bill Summary
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Subtotal ({totalQty} items)</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                  {formatMoney(subtotalMinor)}
                </Text>
              </View>

              {discountMinor > 0 ? (
                <View style={styles.rowBetween}>
                  <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '600' }}>Promo Discount</Text>
                  <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '800' }}>
                    - {formatMoney(discountMinor)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Truck size={14} color={deliveryFeeMinor === 0 ? '#16A34A' : colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Delivery Fee</Text>
                </View>
                <Text
                  style={{
                    color: deliveryFeeMinor === 0 ? '#16A34A' : colors.textPrimary,
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  {deliveryFeeMinor === 0 ? 'FREE' : formatMoney(deliveryFeeMinor)}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Tax &amp; Platform Fee</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  {formatMoney(taxMinor)}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>Total Payable</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Incl. delivery &amp; discounts</Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>
                  {formatMoney(finalTotalMinor)}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Checkout Bar */}
      {cartItems.length > 0 ? (
        <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              TOTAL ({totalQty} ITEM{totalQty > 1 ? 'S' : ''})
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>
              {formatMoney(finalTotalMinor)}
            </Text>
          </View>
          <View style={{ flex: 1.4 }}>
            <PrimaryButton
              title="Proceed to Checkout"
              rightIcon={<ArrowRight size={16} color="#FFFFFF" />}
              fullWidth
              onPress={() => router.push('/checkout')}
            />
          </View>
        </View>
      ) : null}

      <ConfirmationDialog
        visible={clearConfirmOpen}
        title="Clear Shopping Cart?"
        message={`Remove all ${totalQty} item(s) from ${cartRestaurantName ?? 'your cart'}?`}
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          setClearConfirmOpen(false);
          showToast('Cart cleared', 'info');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { flex: 1, height: 2, maxWidth: 36, borderRadius: 999 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  kitchenCard: { padding: 14, borderWidth: 1.5, gap: 12 },
  storeBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitchenMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addMoreLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemCard: { padding: 14, borderWidth: 1 },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  savingsPill: { paddingHorizontal: 12, paddingVertical: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  divider: { height: 1, marginVertical: 4 },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
