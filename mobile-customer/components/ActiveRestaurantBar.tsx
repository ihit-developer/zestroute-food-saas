import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftRight, CheckCircle2, Clock, Lock, Star, Store } from 'lucide-react-native';
import type { RestaurantCardData } from '@zestroute/shared';
import { useTheme } from '../hooks/useTheme';
import { BottomSheet, ConfirmationDialog, useToast } from './ui';
import { useAppStore, type ActiveRestaurantSession } from '../store/useAppStore';

interface ActiveRestaurantBarProps {
  restaurants: RestaurantCardData[];
  onSwitched?: (rest: ActiveRestaurantSession) => void;
  compact?: boolean;
}

export const ActiveRestaurantBar: React.FC<ActiveRestaurantBarProps> = ({
  restaurants,
  onSwitched,
  compact = false,
}) => {
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const activeRestaurant = useAppStore((s) => s.activeRestaurant);
  const switchActiveRestaurant = useAppStore((s) => s.switchActiveRestaurant);
  const cartRestaurantName = useAppStore((s) => s.cartRestaurantName);
  const cartCount = useAppStore((s) => s.cartItems.reduce((acc, i) => acc + i.quantity, 0));

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ActiveRestaurantSession | null>(null);

  if (!activeRestaurant) return null;

  const handleSelectTarget = (r: RestaurantCardData) => {
    const next: ActiveRestaurantSession = {
      id: r.id,
      name: r.name,
      cuisineLabel: r.cuisineLabel,
      locationLabel: r.locationLabel,
    };
    if (activeRestaurant.id === r.id) {
      setSheetOpen(false);
      return;
    }
    const res = switchActiveRestaurant(next, false);
    if (res === 'needs_confirm') {
      setSheetOpen(false);
      setConfirmTarget(next);
    } else {
      setSheetOpen(false);
      showToast(`Switched kitchen to ${next.name}`, 'success');
      onSwitched?.(next);
    }
  };

  const handleConfirmSwitch = () => {
    if (!confirmTarget) return;
    switchActiveRestaurant(confirmTarget, true);
    showToast(`Cart cleared · Now ordering from ${confirmTarget.name}`, 'success');
    const target = confirmTarget;
    setConfirmTarget(null);
    onSwitched?.(target);
  };

  return (
    <>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderRadius: radii.lg,
            padding: compact ? 10 : 12,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderRadius: radii.md }]}>
          <Store size={18} color={colors.primary} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.topRow}>
            <View style={styles.liveDot} />
            <Text style={[styles.kicker, { color: colors.primary }]}>
              ACTIVE KITCHEN · 1-KITCHEN ORDER
            </Text>
          </View>
          <Text style={[styles.restName, { color: colors.textPrimary }]} numberOfLines={1}>
            {activeRestaurant.name}
          </Text>
          {!compact ? (
            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
              {cartCount > 0
                ? `${cartCount} item${cartCount > 1 ? 's' : ''} in cart · Other kitchens hidden`
                : 'Menu & Explore locked to this kitchen'}
            </Text>
          ) : null}
        </View>

        {restaurants.length > 1 ? (
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={[
              styles.switchBtn,
              { backgroundColor: colors.primary, borderRadius: radii.md },
            ]}
          >
            <ArrowLeftRight size={13} color="#FFFFFF" />
            <Text style={styles.switchBtnText}>Switch</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Switch Restaurant Sheet */}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Switch Active Kitchen"
      >
        <View style={{ gap: 10 }}>
          <View
            style={[
              styles.ruleNotice,
              { backgroundColor: colors.primarySoft, borderRadius: radii.md },
            ]}
          >
            <Lock size={14} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.textPrimary, lineHeight: 17 }}>
              You can order from one restaurant at a time. Only your chosen kitchen's dishes appear in Explore & Menu.
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
            {restaurants.map((r) => {
              const isCurrent = activeRestaurant.id === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => handleSelectTarget(r)}
                  style={[
                    styles.sheetCard,
                    {
                      backgroundColor: isCurrent ? colors.primarySoft : colors.surface,
                      borderColor: isCurrent ? colors.primary : colors.border,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                        {r.name}
                      </Text>
                      {isCurrent ? (
                        <CheckCircle2 size={15} color={colors.primary} />
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                      {r.cuisineLabel} · {r.locationLabel ?? 'Lahore'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Star size={12} color={colors.accent} fill={colors.accent} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                          {r.rating.toFixed(1)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                          {r.deliveryTimeLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.selectPill,
                      {
                        backgroundColor: isCurrent ? colors.primary : colors.background,
                        borderColor: isCurrent ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isCurrent ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {isCurrent ? 'Active' : 'Select'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </BottomSheet>

      {/* Single-Restaurant Cart Guard Dialog */}
      <ConfirmationDialog
        visible={Boolean(confirmTarget)}
        title={`Switch to ${confirmTarget?.name ?? 'Kitchen'}?`}
        message={`You can only order from one restaurant at a time. Switching to ${confirmTarget?.name ?? 'this kitchen'} will clear your current ${cartRestaurantName ?? activeRestaurant.name} cart (${cartCount} item${cartCount > 1 ? 's' : ''}).`}
        onConfirm={handleConfirmSwitch}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  restName: {
    fontSize: 15,
    fontWeight: '800',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  switchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  sheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1.5,
    padding: 12,
  },
  selectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
