import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, TopNav, useToast } from '../../components/ui';
import { httpClient } from '../../services/apiClient';
import { useAppStore } from '../../store/useAppStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('Full name must be at least 2 characters', 'error');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (newPassword.length > 0) {
      if (!currentPassword) {
        showToast('Enter your current password to set a new password', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('New password and confirmation do not match', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await httpClient.patch<{
        id?: string;
        fullName: string;
        email?: string;
        phone?: string;
      }>('/profile', {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (user) {
        setSession({
          ...user,
          fullName: updated?.fullName ?? fullName.trim(),
          email: updated?.email ?? email.trim(),
          phone: updated?.phone ?? phone.trim(),
        });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(newPassword ? 'Profile & password updated!' : 'Profile updated!', 'success');
      router.back();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Edit Profile & Security"
        subtitle="Update name, email, phone & password"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Information</Text>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            leftIcon={<User size={16} color={colors.textSecondary} />}
          />
          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            leftIcon={<Mail size={16} color={colors.textSecondary} />}
          />
          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="03001234567"
            leftIcon={<Phone size={16} color={colors.textSecondary} />}
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Change Password (Optional)</Text>
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
              {showPass ? (
                <EyeOff size={18} color={colors.textSecondary} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
          <InputField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPass}
            placeholder="Enter current password"
            leftIcon={<Lock size={16} color={colors.textSecondary} />}
          />
          <InputField
            label="New Password (min 8 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPass}
            placeholder="Enter new password"
            leftIcon={<Lock size={16} color={colors.textSecondary} />}
          />
          <InputField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPass}
            placeholder="Re-enter new password"
            leftIcon={<Lock size={16} color={colors.textSecondary} />}
          />
        </View>

        <PrimaryButton
          title={saving ? 'Saving Changes...' : 'Save Profile & Security'}
          fullWidth
          disabled={saving}
          onPress={() => void handleSave()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
