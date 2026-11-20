import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton, SecondaryButton } from './Button';

export const LoadingSkeleton: React.FC<{
  width?: number | `${number}%`;
  height?: number;
  circle?: boolean;
}> = ({ width = '100%', height = 16, circle = false }) => {
  const { colors, radii } = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: circle ? 9999 : radii.sm,
        backgroundColor: colors.skeletonBase,
      }}
    />
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => {
  const { colors, radii } = useTheme();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Inbox size={24} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && <PrimaryButton title={actionLabel} onPress={onAction} />}
    </View>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title, message, onRetry }) => {
  const { colors, radii, strings } = useTheme();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.error, borderRadius: radii.lg },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
        <AlertTriangle size={22} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title ?? strings.somethingWentWrong}
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <SecondaryButton
          title={strings.retry}
          onPress={onRetry}
          leftIcon={<RefreshCw size={15} color={colors.textPrimary} />}
        />
      )}
    </View>
  );
};

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  const { colors, strings } = useTheme();
  return (
    <View style={styles.pageRow}>
      <SecondaryButton
        title={strings.previous}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      />
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        {page} / {Math.max(1, totalPages)}
      </Text>
      <SecondaryButton
        title={strings.next}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
      />
    </View>
  );
};

type ToastTone = 'success' | 'error' | 'info' | 'warning';

const ToastContext = createContext<{ showToast: (msg: string, tone?: ToastTone) => void } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, radii, shadows } = useTheme();
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null);

  const showToast = useCallback((msg: string, tone: ToastTone = 'info') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
            shadows.md.native,
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
            {toast.msg}
          </Text>
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
  box: { padding: 24, borderWidth: 1, alignItems: 'center', gap: 10 },
  iconCircle: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center' },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
});
