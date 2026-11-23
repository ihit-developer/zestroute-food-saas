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
        <Rect width="40" height="40" rx="12" fill="#F4630C" />
        <Path
          d="M17.2 10.5C16.6 9.1 17.8 8 17.2 6.6M20 9.8C19.4 8.2 20.6 7.1 20 5.5M22.8 10.5C22.2 9.1 23.4 8 22.8 6.6"
          stroke="#FFE5A8"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <Circle cx="20" cy="12.6" r="1.8" fill="#FFE29E" />
        <Path
          d="M9.5 24.8C9.5 18.6 14.1 14.2 20 14.2C25.9 14.2 30.5 18.6 30.5 24.8H9.5Z"
          fill={PALETTE.white}
        />
        <Rect x="7.5" y="26.4" width="25" height="2.8" rx="1.4" fill={PALETTE.white} />
        <Path
          d="M12.5 31.2Q20 34 27.5 31.2"
          stroke="#FFE29E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </Svg>
      {!compact && (
        <View>
          <Text style={[styles.wordmark, { color: colors.textPrimary }]}>
            Dastar<Text style={{ color: colors.primary }}>khwan</Text>
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
