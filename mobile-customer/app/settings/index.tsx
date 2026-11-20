import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  ConfirmationDialog,
  IconButton,
  SecondaryButton,
  TopNav,
  useToast,
} from '../../components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, toggleMode, locale, setLocale, colors, radii } = useTheme();
  const { showToast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Settings"
        subtitle="Theme, language (RTL), privacy & notifications"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Dark Mode</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Switch between Warm Cream &amp; Dark</Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={toggleMode} trackColor={{ true: colors.primary }} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rowBetween}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Urdu Language (RTL)</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Switch between English &amp; اردو</Text>
            </View>
            <Switch
              value={locale === 'ur'}
              onValueChange={(v) => setLocale(v ? 'ur' : 'en')}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rowBetween}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Push Notifications</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Order updates &amp; offers</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <SecondaryButton
          title="Delete Account"
          leftIcon={<Trash2 size={16} color={colors.error} />}
          onPress={() => setDeleteOpen(true)}
        />
      </ScrollView>

      <ConfirmationDialog
        visible={deleteOpen}
        title="Delete Account?"
        message="This action permanently deactivates your profile and anonymizes personal data. Active orders must be completed first."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          showToast('Account deletion connects in Phase 9', 'info');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1 },
});
