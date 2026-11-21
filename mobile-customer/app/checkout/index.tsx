import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CreditCard, MapPin, ShieldCheck, Smartphone, Store, Wallet } from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  IconButton,
  InputField,
  PrimaryButton,
  SecondaryButton,
  TopNav,
  useToast,
} from '../../components/ui';
import { useAppStore } from '../../store/useAppStore';
import { API_BASE_URL, httpClient, tokenStorage } from '../../services/apiClient';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Cash on Delivery', Icon: Banknote },
  { key: 'jazzcash', label: 'JazzCash (Online Verified)', Icon: Smartphone },
  { key: 'easypaisa', label: 'Easypaisa (Online Verified)', Icon: Smartphone },
  { key: 'card', label: 'Bank Transfer / Card (Online Verified)', Icon: CreditCard },
  { key: 'wallet', label: 'Dastarkhwan Wallet', Icon: Wallet },
] as const;

const MERCHANT_ACCOUNT_INFO: Record<'jazzcash' | 'easypaisa' | 'card', string> = {
  jazzcash: 'JazzCash Merchant Account: 0300-1234567 (Dastarkhwan Foods)',
  easypaisa: 'Easypaisa Merchant Account: 0345-1234567 (Dastarkhwan Foods)',
  card: 'Bank IBAN: PK36DAST00001234567890 (Dastarkhwan Pvt Ltd)',
};

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const { selectedAddress, cartItems, cartRestaurantId, cartRestaurantName, appliedCouponCode, clearCart, user } = useAppStore();

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'jazzcash' | 'easypaisa' | 'card' | 'wallet'>('cod');
  const [tipMinor, setTipMinor] = useState<number>(0);
  const [instructions, setInstructions] = useState('');
  const [accountNumber, setAccountNumber] = useState(user?.phone ?? '');
  const [transactionRef, setTransactionRef] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOnlinePayment =
    paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'card';

  const handleSendOtp = async () => {
    if (!isOnlinePayment) return;
    if (accountNumber.trim().length < 4) {
      showToast('Enter your JazzCash/Easypaisa mobile or Bank/Card number first', 'error');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await httpClient.post<{ sent: boolean; maskedAccount: string; devOtp?: string }>(
        '/payments/send-verification-otp',
        {
          provider: paymentMethod,
          accountNumber: accountNumber.trim(),
        }
      );
      setOtpSent(true);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
        showToast(`Verification OTP sent! (Dev OTP: ${res.devOtp})`, 'success');
      } else {
        showToast(`Verification OTP sent to ${res.maskedAccount}`, 'success');
      }
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to send verification OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (submitting) return;
    if (cartItems.length === 0 || !cartRestaurantId) {
      showToast('Your cart is empty', 'error');
      return;
    }

    const token = await tokenStorage.getAccessToken();
    if (!token) {
      showToast('Please sign in first to place an order', 'error');
      router.push('/(auth)/login');
      return;
    }

    // Validate online payment verification fields BEFORE creating the order
    if (isOnlinePayment) {
      if (accountNumber.trim().length < 4) {
        showToast('Enter your sender account / mobile / card number', 'error');
        return;
      }
      if (transactionRef.trim().length < 6) {
        showToast('Enter a valid Transaction ID / Bank Ref (min 6 characters)', 'error');
        return;
      }
      if (!otpSent || otpCode.trim().length !== 6) {
        showToast('Send and enter the 6-digit payment verification OTP first', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Ensure a valid MongoDB delivery address exists on the backend
      let addressId =
        selectedAddress?.id && /^[0-9a-fA-F]{24}$/.test(selectedAddress.id)
          ? selectedAddress.id
          : undefined;
      if (!addressId) {
        const saved = await httpClient.get<Array<{ _id: string }>>('/addresses');
        if (saved.length > 0) {
          addressId = saved[0]._id;
        } else {
          const createdAddr = await httpClient.post<{ _id: string }>('/addresses', {
            label: 'home',
            fullName: user?.fullName || 'Customer',
            phone: user?.phone || '03000000003',
            city: 'Lahore',
            area: 'Gulberg III',
            street: 'Main Boulevard',
            houseNumber: 'House 12',
            latitude: 31.5102,
            longitude: 74.3587,
            isDefault: true,
          });
          addressId = createdAddr._id;
        }
      }

      // 2. Get branch for restaurant and sync cart items to server
      const restDetails = await httpClient.get<{ branches: Array<{ _id: string }> }>(
        `/catalog/restaurants/${cartRestaurantId}`,
        true
      );
      const branchId = restDetails.branches?.[0]?._id;
      if (!branchId) {
        throw new Error('Restaurant branch unavailable');
      }

      await httpClient.del('/cart').catch(() => {});
      for (const item of cartItems) {
        await httpClient.post('/cart/items', {
          foodItemId: item.foodId,
          branchId,
          variantId: item.variantId,
          quantity: item.quantity,
          addons: [],
          specialInstructions: item.specialInstructions,
          replaceCart: true,
        });
      }

      if (appliedCouponCode) {
        await httpClient.post('/cart/coupon', { code: appliedCouponCode }).catch(() => {});
      }

      // 3. Create server-verified order with unique Idempotency-Key
      const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          tipMinor,
          deliveryInstructions: instructions.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { _id: string; orderNumber: string };
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Order creation failed');
      }

      // 4. If online payment, verify transaction & OTP server-side so order is marked PAID
      if (isOnlinePayment) {
        await httpClient.post('/payments/verify-online', {
          orderId: json.data._id,
          provider: paymentMethod,
          accountNumber: accountNumber.trim(),
          transactionRef: transactionRef.trim(),
          otpCode: otpCode.trim(),
        });
      }

      clearCart();
      await queryClient.invalidateQueries({ queryKey: ['customer', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
      showToast(
        isOnlinePayment
          ? `Payment verified & Order ${json.data.orderNumber} placed!`
          : `Order ${json.data.orderNumber} placed!`,
        'success'
      );
      router.replace(`/order/tracking/${json.data._id}`);
    } catch (err) {
      const msg = err instanceof ApiClientError || err instanceof Error ? err.message : 'Unable to place order';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Checkout"
        subtitle="Review, verify payment & confirm"
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
            { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.row}>
            <Store size={18} color={colors.primary} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
              Ordering from: {cartRestaurantName ?? 'Selected Restaurant'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {cartItems.reduce((s, i) => s + i.quantity, 0)} item(s) ready for kitchen confirmation
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/addresses')}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}
        >
          <View style={styles.row}>
            <MapPin size={18} color={colors.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
              Delivery Address
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {selectedAddress
              ? `${selectedAddress.houseNumber}, ${selectedAddress.street}, ${selectedAddress.area}, ${selectedAddress.city}`
              : 'Uses your default saved address (tap to change)'}
          </Text>
        </Pressable>

        <InputField
          label="Delivery Instructions"
          placeholder="Ring doorbell, call on arrival..."
          value={instructions}
          onChangeText={setInstructions}
        />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
            Payment Method
          </Text>
          {PAYMENT_METHODS.map((pm) => {
            const active = paymentMethod === pm.key;
            const Icon = pm.Icon;
            return (
              <Pressable
                key={pm.key}
                onPress={() => {
                  setPaymentMethod(pm.key);
                  setOtpSent(false);
                  setDevOtpHint(null);
                  setOtpCode('');
                }}
                style={[
                  styles.pmRow,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.surfaceElevated,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <Icon size={18} color={active ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                  {pm.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Online Payment Verification Card */}
        {isOnlinePayment ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderWidth: 1.5,
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={styles.row}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                Online Payment Verification ({paymentMethod.toUpperCase()})
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {MERCHANT_ACCOUNT_INFO[paymentMethod]}
            </Text>

            <InputField
              label={
                paymentMethod === 'card'
                  ? 'Bank Account / Card Number'
                  : `${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Mobile Number`
              }
              placeholder={paymentMethod === 'card' ? 'PK... or last 4+ card digits' : '03001234567'}
              value={accountNumber}
              onChangeText={setAccountNumber}
            />

            <InputField
              label="Transaction ID (TID / Bank Ref #)"
              placeholder="e.g., JC-8849201"
              value={transactionRef}
              onChangeText={setTransactionRef}
            />

            <SecondaryButton
              title={sendingOtp ? 'Sending OTP...' : otpSent ? 'Resend Verification OTP' : 'Send 6-Digit Verification OTP'}
              fullWidth
              disabled={sendingOtp}
              onPress={() => void handleSendOtp()}
            />

            {devOtpHint ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                Dev Test OTP: {devOtpHint}
              </Text>
            ) : null}

            <InputField
              label="Enter 6-Digit Verification OTP"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
            />
          </View>
        ) : null}

        {/* Tip Your Rider Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, gap: 10 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
              Tip Your Delivery Rider
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
              {tipMinor > 0 ? `+ PKR ${tipMinor / 100}` : '100% goes to Rider'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'No Tip', minor: 0 },
              { label: 'PKR 50', minor: 5000 },
              { label: 'PKR 100', minor: 10000 },
              { label: 'PKR 200', minor: 20000 },
              { label: 'PKR 300', minor: 30000 },
            ].map((opt) => {
              const active = tipMinor === opt.minor;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setTipMinor(opt.minor)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.background,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: active ? colors.primary : colors.textPrimary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton
          title={isOnlinePayment ? 'Verify Payment & Place Order' : 'Confirm Order'}
          fullWidth
          loading={submitting}
          onPress={() => void handleConfirmOrder()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pmRow: { padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
