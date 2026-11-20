import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Calendar, ChevronDown, Search, Upload, X } from 'lucide-react-native';
import type { SelectOption } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  style,
  ...props
}) => {
  const { colors, radii, rtl } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        {leftIcon}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              textAlign: rtl ? 'right' : 'left',
            },
            style,
          ]}
          {...props}
        />
        {rightElement}
      </View>
      {error ? (
        <Text style={[styles.helper, { color: colors.error }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: colors.textSecondary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

export const SearchBar: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}> = ({ value, onChangeText, placeholder }) => {
  const { colors, radii, strings, rtl } = useTheme();
  return (
    <View
      style={[
        styles.inputBox,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.full,
        },
      ]}
    >
      <Search size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? strings.searchPlaceholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.textPrimary, textAlign: rtl ? 'right' : 'left' }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

export const Dropdown: React.FC<{
  label?: string;
  selectedLabel: string;
  options: SelectOption[];
  onPress: () => void;
  error?: string;
}> = ({ label, selectedLabel, onPress, error }) => {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <Pressable
        onPress={onPress}
        style={[
          styles.inputBox,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radii.md,
            justifyContent: 'space-between',
          },
        ]}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{selectedLabel}</Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>
      {error && <Text style={[styles.helper, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

export const DatePicker: React.FC<{
  label?: string;
  value: string;
  onPress: () => void;
}> = ({ label, value, onPress }) => {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <Pressable
        onPress={onPress}
        style={[
          styles.inputBox,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
        ]}
      >
        <Calendar size={18} color={colors.textSecondary} />
        <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{value}</Text>
      </Pressable>
    </View>
  );
};

export const ImageUploader: React.FC<{
  label?: string;
  onPress: () => void;
  helperText?: string;
}> = ({ label, onPress, helperText = 'Tap to upload food or profile photo' }) => {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <Pressable
        onPress={onPress}
        style={[
          styles.uploader,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.lg,
          },
        ]}
      >
        <View style={[styles.uploadIcon, { backgroundColor: colors.primarySoft }]}>
          <Upload size={20} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>Upload Image</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{helperText}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  inputBox: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  helper: { fontSize: 12 },
  uploader: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
