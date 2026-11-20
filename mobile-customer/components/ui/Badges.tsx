import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PALETTE, type SemanticTone } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';

export const StatusBadge: React.FC<{
  label: string;
  tone?: SemanticTone;
}> = ({ label, tone = 'neutral' }) => {
  const { colors } = useTheme();

  const toneMap: Record<SemanticTone, { bg: string; fg: string }> = {
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    error: { bg: colors.errorBg, fg: colors.error },
    info: { bg: colors.infoBg, fg: colors.info },
    primary: { bg: colors.primarySoft, fg: colors.secondary },
    neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
  };

  const palette = toneMap[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
};

export const DiscountBadge: React.FC<{ text: string }> = ({ text }) => (
  <View style={[styles.badge, { backgroundColor: PALETTE.warmYellow }]}>
    <Text style={[styles.text, { color: PALETTE.espressoText, fontWeight: '700' }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 9999 },
  text: { fontSize: 12, fontWeight: '600' },
});
