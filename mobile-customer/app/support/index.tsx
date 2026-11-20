import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, MessageSquarePlus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  IconButton,
  PrimaryButton,
  StatusBadge,
  TopNav,
} from '../../components/ui';
import { useSupportTickets } from '../../hooks/useCustomerData';

const FAQS = [
  {
    q: 'How do I report missing or wrong food items?',
    a: 'Tap "Submit New Ticket" below, choose Missing Food or Wrong Order, and attach your order number.',
  },
  {
    q: 'How do refunds work?',
    a: 'Approved refunds are credited to your ZestRoute Wallet or original payment method per platform policy.',
  },
  {
    q: 'How can I track my delivery rider?',
    a: 'Open Orders -> Active -> Track to view live rider location and ETA updates.',
  },
];

export default function SupportCenterScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { data: tickets } = useSupportTickets();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Help & Support"
        subtitle="FAQs, complaints & live chat"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <PrimaryButton
          title="Submit Complaint / New Ticket"
          leftIcon={<MessageSquarePlus size={18} color="#FFFFFF" />}
          fullWidth
          onPress={() => router.push('/support/new-ticket')}
        />

        <Text style={[styles.heading, { color: colors.textPrimary }]}>Frequently Asked Questions</Text>
        {FAQS.map((item, idx) => (
          <Pressable
            key={item.q}
            onPress={() => setOpenFaq((cur) => (cur === idx ? null : idx))}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                {item.q}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </View>
            {openFaq === idx && (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{item.a}</Text>
            )}
          </Pressable>
        ))}

        <Text style={[styles.heading, { color: colors.textPrimary }]}>My Support Tickets</Text>
        {tickets.length === 0 ? (
          <EmptyState
            title="No support tickets"
            description="Your submitted complaints and support conversations will appear here."
          />
        ) : (
          tickets.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/support/ticket/${t.id}`)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{t.ticketNumber}</Text>
                <StatusBadge label={t.status} tone="info" />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t.subject}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  card: { padding: 14, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
