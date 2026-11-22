import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  IconButton,
  InputField,
  PrimaryButton,
  Tabs,
  TopNav,
  useToast,
} from '../../components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@zestroute/shared';
import { supportTicketSchema } from '../../features/validation/authSchemas';
import { httpClient } from '../../services/apiClient';

type TicketForm = {
  category: 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund' | 'other';
  orderNumber?: string;
  subject: string;
  description: string;
};

export default function NewSupportTicketScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [cat, setCat] = useState<TicketForm['category']>('missing_food');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketForm>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: { category: 'missing_food', orderNumber: '', subject: '', description: '' },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="New Support Ticket"
        subtitle="Report an order or delivery issue"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Tabs
          items={[
            { key: 'missing_food', label: 'Missing' },
            { key: 'wrong_order', label: 'Wrong' },
            { key: 'late_delivery', label: 'Late' },
            { key: 'refund', label: 'Refund' },
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
          name="orderNumber"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Order Number (Optional)"
              placeholder="e.g., ORD-1042"
              value={value ?? ''}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="subject"
          render={({ field: { value, onChange } }) => (
            <InputField
              label="Subject"
              placeholder="Brief summary of the issue"
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
              label="Details"
              placeholder="Describe what happened..."
              multiline
              numberOfLines={4}
              value={value}
              onChangeText={onChange}
              error={errors.description?.message}
            />
          )}
        />

        <PrimaryButton
          title="Submit Ticket"
          fullWidth
          onPress={handleSubmit(async (values) => {
            try {
              const created = await httpClient.post<{ id?: string; _id?: string }>('/support/tickets', {
                category: values.category,
                subject: values.subject.trim(),
                message: values.description.trim(),
              });
              await queryClient.invalidateQueries({ queryKey: ['customer', 'support-tickets'] });
              showToast('Support ticket created! Connecting to live chat...', 'success');
              const ticketId = created?.id ?? created?._id;
              if (ticketId) {
                router.replace(`/support/ticket/${ticketId}`);
              } else {
                router.back();
              }
            } catch (err) {
              showToast(err instanceof ApiClientError ? err.message : 'Unable to submit ticket', 'error');
            }
          })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
});
