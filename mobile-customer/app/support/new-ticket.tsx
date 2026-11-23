import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Headphones, ShoppingBag, Store } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../hooks/useTheme';
import {
  IconButton,
  InputField,
  PrimaryButton,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { supportTicketSchema } from '../../features/validation/authSchemas';
import { httpClient } from '../../services/apiClient';
import { useCustomerOrders, useHomeFeed } from '../../hooks/useCustomerData';

type TicketForm = {
  category: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
  orderNumber?: string;
  subject: string;
  description: string;
};

export default function NewSupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string; orderId?: string }>();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();

  const [targetType, setTargetType] = useState<'restaurant' | 'admin'>(
    params.target === 'restaurant' ? 'restaurant' : 'admin'
  );
  const [cat, setCat] = useState<TicketForm['category']>(
    params.target === 'restaurant' ? 'missing_food' : 'other'
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params.orderId ?? null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: activeOrders } = useCustomerOrders('active');
  const { data: completedOrders } = useCustomerOrders('completed');
  const { data: feed } = useHomeFeed(null);

  const recentOrders = useMemo(
    () => [...activeOrders, ...completedOrders].slice(0, 6),
    [activeOrders, completedOrders]
  );

  const pickedOrder = useMemo(
    () => recentOrders.find((o) => o.id === selectedOrderId) ?? null,
    [recentOrders, selectedOrderId]
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketForm>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      category: params.target === 'restaurant' ? 'missing_food' : 'other',
      orderNumber: '',
      subject: '',
      description: '',
    },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={targetType === 'restaurant' ? 'Chat with Restaurant' : 'Dastarkhwan Support'}
        subtitle={
          targetType === 'restaurant'
            ? 'Direct live chat with the kitchen owner'
            : 'Platform, rider, refund & account help'
        }
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Hybrid Routing Selector */}
        <View style={styles.routeRow}>
          <Pressable
            onPress={() => setTargetType('restaurant')}
            style={[
              styles.routeCard,
              {
                backgroundColor: targetType === 'restaurant' ? colors.primarySoft : colors.surface,
                borderColor: targetType === 'restaurant' ? colors.primary : colors.border,
                borderRadius: radii.lg,
              },
            ]}
          >
            <Store size={18} color={targetType === 'restaurant' ? colors.primary : colors.textSecondary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: targetType === 'restaurant' ? colors.primary : colors.textPrimary,
              }}
            >
              Restaurant Kitchen
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.textSecondary, textAlign: 'center' }}>
              Food &amp; Order Help
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTargetType('admin')}
            style={[
              styles.routeCard,
              {
                backgroundColor: targetType === 'admin' ? 'rgba(37,99,235,0.12)' : colors.surface,
                borderColor: targetType === 'admin' ? '#2563EB' : colors.border,
                borderRadius: radii.lg,
              },
            ]}
          >
            <Headphones size={18} color={targetType === 'admin' ? '#2563EB' : colors.textSecondary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: targetType === 'admin' ? '#2563EB' : colors.textPrimary,
              }}
            >
              Super Admin
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.textSecondary, textAlign: 'center' }}>
              Rider, Refund &amp; App
            </Text>
          </Pressable>
        </View>

        {/* Attach Recent Order (1-Tap Order Card Picker) */}
        {recentOrders.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Attach an Order {targetType === 'restaurant' ? '(Recommended)' : '(Optional)'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recentOrders.map((ord) => {
                const active = selectedOrderId === ord.id;
                return (
                  <Pressable
                    key={ord.id}
                    onPress={() => {
                      const next = active ? null : ord.id;
                      setSelectedOrderId(next);
                      setSelectedRestaurantId(next ? ord.restaurantId : null);
                      setValue('orderNumber', next ? ord.orderNumber : '');
                    }}
                    style={[
                      styles.orderChip,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      {active ? (
                        <CheckCircle2 size={14} color={colors.primary} />
                      ) : (
                        <ShoppingBag size={14} color={colors.textSecondary} />
                      )}
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textPrimary }}>
                        {ord.orderNumber}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.textSecondary }} numberOfLines={1}>
                      {ord.restaurantName} · {formatMoney(ord.totalMinor)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* If chatting with Restaurant without an order, pick a Restaurant */}
        {targetType === 'restaurant' && !pickedOrder && feed.popularRestaurants.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Select Restaurant *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {feed.popularRestaurants.map((rest) => {
                const active = selectedRestaurantId === rest.id;
                return (
                  <Pressable
                    key={rest.id}
                    onPress={() => setSelectedRestaurantId(rest.id)}
                    style={[
                      styles.orderChip,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? colors.primary : colors.textPrimary }}>
                      {rest.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{rest.cuisineLabel}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <Tabs
          items={[
            { key: 'missing_food', label: 'Missing' },
            { key: 'wrong_order', label: 'Wrong' },
            { key: 'late_delivery', label: 'Late' },
            { key: 'refund', label: 'Refund' },
            { key: 'other', label: 'Other' },
          ]}
          activeKey={cat}
          onChange={(k) => {
            const c = k as TicketForm['category'];
            setCat(c);
            setValue('category', c);
          }}
        />

        <Controller
          control={control}
          name="subject"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Subject"
              placeholder={
                targetType === 'restaurant'
                  ? 'e.g. Extra sauce or missing item in my order'
                  : 'e.g. Refund status or rider help'
              }
              value={value}
              onChangeText={onChange}
              error={errors.subject?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Message"
              placeholder="Write your message to start live chat..."
              multiline
              numberOfLines={4}
              value={value}
              onChangeText={onChange}
              error={errors.description?.message}
            />
          )}
        />

        <PrimaryButton
          title={targetType === 'restaurant' ? 'Start Live Chat with Restaurant' : 'Start Live Chat with Admin'}
          fullWidth
          loading={submitting}
          onPress={handleSubmit(async (values) => {
            const resolvedRestId = pickedOrder?.restaurantId ?? selectedRestaurantId ?? undefined;
            if (targetType === 'restaurant' && !resolvedRestId) {
              showToast('Please select an order or restaurant to chat with', 'error');
              return;
            }
            setSubmitting(true);
            try {
              const created = await httpClient.post<{ id?: string; _id?: string }>('/support/tickets', {
                targetType,
                orderId: pickedOrder?.id,
                orderNumber: values.orderNumber?.trim() || undefined,
                restaurantId: resolvedRestId,
                category: values.category,
                subject: values.subject.trim(),
                message: values.description.trim(),
              });
              await queryClient.invalidateQueries({ queryKey: ['customer', 'support-tickets'] });
              showToast('Live chat started!', 'success');
              const ticketId = created?.id ?? created?._id;
              if (ticketId) {
                router.replace(`/support/ticket/${ticketId}`);
              } else {
                router.back();
              }
            } catch (err) {
              showToast(err instanceof ApiClientError ? err.message : 'Unable to start live chat', 'error');
            } finally {
              setSubmitting(false);
            }
          })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 15, paddingBottom: 36 },
  routeRow: { flexDirection: 'row', gap: 10 },
  routeCard: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  label: { fontSize: 13, fontWeight: '800' },
  orderChip: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 155,
    maxWidth: 210,
    gap: 2,
  },
});
