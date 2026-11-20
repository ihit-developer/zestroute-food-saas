import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AlertTriangle, Inbox, RefreshCw, Upload, X } from 'lucide-react-native';
import { PALETTE, type SemanticTone, type TabItem } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';

export const ZestRouteLogo: React.FC<{ size?: number; subtitle?: string }> = ({
  size = 40,
  subtitle = 'RIDER PARTNER',
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect width="40" height="40" rx="12" fill={PALETTE.orange} />
        <Path
          d="M10 24.5C10 18.701 14.477 14 20 14C25.523 14 30 18.701 30 24.5H10Z"
          fill={PALETTE.white}
        />
        <Rect x="8.5" y="26.5" width="23" height="3" rx="1.5" fill={PALETTE.warmYellow} />
        <Circle cx="20" cy="11.5" r="2.2" fill={PALETTE.warmYellow} />
      </Svg>
      <View>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.textPrimary }}>
          Zest<Text style={{ color: colors.primary }}>Route</Text>
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

export const PrimaryButton: React.FC<{
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}> = ({ title, onPress, loading, disabled, fullWidth, leftIcon }) => {
  const { colors, radii, shadows } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? colors.secondary : colors.primary,
          borderRadius: radii.md,
          opacity: disabled || loading ? 0.55 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        shadows.sm.native,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

export const SecondaryButton: React.FC<{
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}> = ({ title, onPress, disabled, fullWidth, leftIcon }) => {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          opacity: disabled ? 0.55 : 1,
          width: fullWidth ? '100%' : undefined,
        },
      ]}
    >
      {leftIcon}
      <Text style={[styles.btnText, { color: colors.textPrimary }]}>{title}</Text>
    </Pressable>
  );
};

export const IconButton: React.FC<{
  icon: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
}> = ({ icon, onPress, accessibilityLabel }) => {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconBtn,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
      ]}
    >
      {icon}
    </Pressable>
  );
};

export const InputField: React.FC<
  TextInputProps & { label?: string; error?: string; leftIcon?: React.ReactNode; rightElement?: React.ReactNode }
> = ({ label, error, leftIcon, rightElement, style, ...props }) => {
  const { colors, radii, rtl } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>{label}</Text>}
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        {leftIcon}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[{ flex: 1, fontSize: 15, color: colors.textPrimary, textAlign: rtl ? 'right' : 'left' }, style]}
          {...props}
        />
        {rightElement}
      </View>
      {error && <Text style={{ fontSize: 12, color: colors.error }}>{error}</Text>}
    </View>
  );
};

export const DocumentUploader: React.FC<{
  label: string;
  helperText?: string;
  onPress: () => void;
}> = ({ label, helperText = 'Tap to upload document photo', onPress }) => {
  const { colors, radii } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={[
          styles.uploader,
          { borderColor: colors.border, backgroundColor: colors.surfaceElevated, borderRadius: radii.lg },
        ]}
      >
        <Upload size={18} color={colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{helperText}</Text>
      </Pressable>
    </View>
  );
};

export const StatusBadge: React.FC<{ label: string; tone?: SemanticTone }> = ({ label, tone = 'neutral' }) => {
  const { colors } = useTheme();
  const map: Record<SemanticTone, { bg: string; fg: string }> = {
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    error: { bg: colors.errorBg, fg: colors.error },
    info: { bg: colors.infoBg, fg: colors.info },
    primary: { bg: colors.primarySoft, fg: colors.secondary },
    neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
  };
  const p = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <View style={[styles.dot, { backgroundColor: p.fg }]} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: p.fg }}>{label}</Text>
    </View>
  );
};

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {leftAction}
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
          {Boolean(subtitle) && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>}
        </View>
      </View>
      {rightAction}
    </View>
  );
};

export const Tabs: React.FC<{
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}> = ({ items, activeKey, onChange }) => {
  const { colors, radii } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radii.md,
        gap: 4,
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
              borderRadius: radii.sm,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : colors.textSecondary }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const EmptyState: React.FC<{ title: string; description?: string; actionLabel?: string; onAction?: () => void }> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.stateBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
      <Inbox size={26} color={colors.primary} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>{title}</Text>
      {description && (
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{description}</Text>
      )}
      {actionLabel && onAction && <PrimaryButton title={actionLabel} onPress={onAction} />}
    </View>
  );
};

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.stateBox, { backgroundColor: colors.surface, borderColor: colors.error, borderRadius: radii.lg }]}>
      <AlertTriangle size={24} color={colors.error} />
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>{message}</Text>
      {onRetry && (
        <SecondaryButton
          title="Try Again"
          onPress={onRetry}
          leftIcon={<RefreshCw size={15} color={colors.textPrimary} />}
        />
      )}
    </View>
  );
};

export const LoadingSkeleton: React.FC<{ height?: number }> = ({ height = 90 }) => {
  const { colors, radii } = useTheme();
  return <View style={{ height, borderRadius: radii.md, backgroundColor: colors.skeletonBase }} />;
};

export const Modal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => {
  const { colors, radii } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={[styles.dialogHead, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
            <Pressable onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={{ padding: 16 }}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

const ToastContext = createContext<{ showToast: (msg: string) => void } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, radii, shadows } = useTheme();
  const [msg, setMsg] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {msg && (
        <View
          style={[
            styles.toast,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
            shadows.md.native,
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{msg}</Text>
        </View>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
  iconBtn: { width: 42, height: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inputBox: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploader: { borderWidth: 1.5, borderStyle: 'dashed', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 9999 },
  topNav: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stateBox: { padding: 24, borderWidth: 1, alignItems: 'center', gap: 10 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  dialog: { borderWidth: 1, overflow: 'hidden' },
  dialogHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  toast: { position: 'absolute', bottom: 24, left: 16, right: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
});
