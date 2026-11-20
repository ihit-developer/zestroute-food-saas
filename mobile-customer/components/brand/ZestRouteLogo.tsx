import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { PALETTE } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';

interface ZestRouteLogoProps {
  compact?: boolean;
  size?: number;
}

export const ZestRouteLogo: React.FC<ZestRouteLogoProps> = ({
  compact = false,
  size = 38,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect width="40" height="40" rx="12" fill={PALETTE.orange} />
        <Path
          d="M10 24.5C10 18.701 14.477 14 20 14C25.523 14 30 18.701 30 24.5H10Z"
          fill={PALETTE.white}
        />
        <Rect x="8.5" y="26.5" width="23" height="3" rx="1.5" fill={PALETTE.warmYellow} />
        <Circle cx="20" cy="11.5" r="2.2" fill={PALETTE.warmYellow} />
      </Svg>
      {!compact && (
        <View>
          <Text style={[styles.wordmark, { color: colors.textPrimary }]}>
            Zest<Text style={{ color: colors.primary }}>Route</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>FRESH &amp; FAST</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
