import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface MobileButtonProps {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton: React.FC<MobileButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}) => {
  const { colors, radii, shadows } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.secondary : colors.primary,
          borderRadius: radii.md,
          opacity: isDisabled ? 0.55 : 1,
          width: fullWidth ? '100%' : undefined,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        shadows.sm.native,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textOnPrimary} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, { color: colors.textOnPrimary }]}>{title}</Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
};

export const SecondaryButton: React.FC<MobileButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}) => {
  const { colors, radii } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          opacity: isDisabled ? 0.55 : 1,
          width: fullWidth ? '100%' : undefined,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{title}</Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
};

export const IconButton: React.FC<{
  icon: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ icon, onPress, accessibilityLabel, disabled = false, style }) => {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
          borderColor: colors.border,
          borderRadius: radii.md,
          opacity: disabled ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
