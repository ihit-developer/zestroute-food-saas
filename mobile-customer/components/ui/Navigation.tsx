import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

export interface MobileNavItem {
  key: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export const TopNav: React.FC<{
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}> = ({ title, subtitle, leftAction, rightAction }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.topNav,
        {
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.topLeft}>
        {leftAction}
        <View>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.topSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction}
    </View>
  );
};

export const BottomNav: React.FC<{
  items: MobileNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}> = ({ items, activeKey, onSelect }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bottomNav,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const tint = active ? colors.primary : colors.textSecondary;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.key)} style={styles.tabBtn}>
            {item.icon(tint)}
            <Text style={[styles.tabLabel, { color: tint, fontWeight: active ? '700' : '500' }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  topTitle: { fontSize: 18, fontWeight: '700' },
  topSub: { fontSize: 12 },
  bottomNav: {
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabBtn: { alignItems: 'center', gap: 3, minWidth: 56, paddingVertical: 4 },
  tabLabel: { fontSize: 11 },
});
