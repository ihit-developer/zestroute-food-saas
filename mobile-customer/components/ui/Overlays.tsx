import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { TabItem } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton, SecondaryButton } from './Button';

export const Modal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => {
  const { colors, radii, shadows } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.border },
            shadows.lg.native,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

export const ConfirmationDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, title, message, onConfirm, onCancel }) => {
  const { colors, strings } = useTheme();
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 18 }}>{message}</Text>
      <View style={styles.actions}>
        <SecondaryButton title={strings.cancel} onPress={onCancel} style={{ flex: 1 }} />
        <PrimaryButton title={strings.confirm} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

export const BottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => {
  const { colors, radii } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHead}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
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
      style={[
        styles.tabRow,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radii.md },
      ]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.tabItem,
              {
                backgroundColor: active ? colors.primary : 'transparent',
                borderRadius: radii.sm,
              },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  dialog: { borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: 20, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tabRow: { flexDirection: 'row', padding: 4, borderWidth: 1, gap: 4 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center' },
});
