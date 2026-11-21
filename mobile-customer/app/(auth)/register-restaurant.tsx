import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Sparkles, Store } from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import { IconButton, InputField, PrimaryButton, useToast } from '../../components/ui';
import { authApi, httpClient, tokenStorage } from '../../services/apiClient';
import { saveAccount } from '../../services/savedAccounts';
import { useAppStore } from '../../store/useAppStore';

export default function RegisterRestaurantScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const setSession = useAppStore((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisines, setCuisines] = useState('Fast Food, Desi, BBQ');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [bankTitle, setBankTitle] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || password.length < 6) {
      showToast('Please enter owner name, email, phone & password (min 6 chars)', 'error');
      return;
    }
    if (!restaurantName.trim() || !area.trim() || !address.trim()) {
      showToast('Please enter restaurant name, area & street address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Register vendor owner account
      const authRes = await authApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role: 'restaurant_owner',
      });
      await tokenStorage.setTokens(authRes.accessToken, authRes.refreshToken);

      // 2. Create restaurant profile -> backend automatically activates 7-day free trial
      await httpClient.post('/restaurant/apply', {
        name: restaurantName.trim(),
        description: `${restaurantName.trim()} on Dastarkhwan`,
        cuisineTypes: cuisines
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        city: city.trim() || 'Lahore',
        area: area.trim(),
        address: address.trim(),
        latitude: 31.5204,
        longitude: 74.3587,
        bankAccountTitle: bankTitle.trim() || fullName.trim(),
        bankIbanMasked: bankAccount.trim() || phone.trim(),
      });

      await saveAccount({
        identifier: email.trim().toLowerCase(),
        password,
        fullName: authRes.user.fullName,
        role: 'vendor',
      });

      setSession({
        id: authRes.user.id,
        fullName: authRes.user.fullName,
        email: authRes.user.email ?? '',
        phone: authRes.user.phone ?? '',
      });

      showToast('Restaurant registered! Your Free Trial is now active.', 'success');
      router.replace('/(vendor)/dashboard');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Registration failed. Please check details.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <IconButton
          icon={<ArrowLeft size={20} color={colors.textPrimary} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />

        {/* Hero Trial Banner */}
        <View style={[styles.hero, { borderRadius: radii.xl }]}>
          <View style={styles.heroBadge}>
            <Sparkles size={13} color="#FDBA74" />
            <Text style={styles.heroBadgeText}>FREE TRIAL INCLUDED</Text>
          </View>
          <Text style={styles.heroTitle}>Launch Your Restaurant on Dastarkhwan</Text>
          <Text style={styles.heroSub}>
            Get full access to live orders, menu builder, customer mobile storefront & analytics immediately upon registration.
          </Text>
        </View>

        {/* Owner Account Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl }]}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Owner Account</Text>
          </View>
          <InputField label="Full Name *" placeholder="e.g. Ali Hassan" value={fullName} onChangeText={setFullName} />
          <InputField
            label="Email *"
            placeholder="owner@myrestaurant.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <InputField label="Mobile Number *" placeholder="03001234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <InputField label="Password *" placeholder="Minimum 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        {/* Restaurant Details Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl }]}>
          <View style={styles.sectionHeader}>
            <Store size={16} color="#2563EB" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. Restaurant Profile</Text>
          </View>
          <InputField label="Restaurant Name *" placeholder="e.g. Royal Karahi House" value={restaurantName} onChangeText={setRestaurantName} />
          <InputField label="Cuisines (comma separated)" placeholder="Desi, BBQ, Fast Food" value={cuisines} onChangeText={setCuisines} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InputField label="City *" placeholder="Lahore" value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Area *" placeholder="Gulberg III" value={area} onChangeText={setArea} />
            </View>
          </View>
          <InputField label="Street Address *" placeholder="Main Boulevard, Plot 14" value={address} onChangeText={setAddress} />
          <InputField label="Payout Account Title" placeholder="Account holder name" value={bankTitle} onChangeText={setBankTitle} />
          <InputField label="Easypaisa / JazzCash / IBAN" placeholder="03XX-XXXXXXX" value={bankAccount} onChangeText={setBankAccount} />
        </View>

        <PrimaryButton
          title="Create Restaurant & Start Free Trial"
          fullWidth
          loading={submitting}
          onPress={() => void handleRegister()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: '#0F172A',
    padding: 20,
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244,123,32,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#FDBA74', letterSpacing: 0.6 },
  heroTitle: { fontSize: 21, fontWeight: '900', color: '#FFFFFF', lineHeight: 27 },
  heroSub: { fontSize: 12.5, color: '#94A3B8', lineHeight: 18 },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
});
