import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Headphones,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  EmptyState,
  IconButton,
  StatusBadge,
  TopNav,
} from '../../components/ui';
import { useSupportTickets } from '../../hooks/useCustomerData';

const FAQS = [
  {
    q: 'When should I chat with the Restaurant vs Dastarkhwan Admin?',
    a: 'Choose "Chat with Restaurant" for food prep, missing/wrong items, or cooking instructions. Choose "Dastarkhwan Support" for rider, payment, wallet, or refund help.',
  },
  {
    q: 'What if a restaurant does not reply to my order chat?',
    a: 'Tap the "Escalate to Admin" button inside any restaurant chat — Dastarkhwan Super Admin joins immediately with priority support.',
  },
  {
    q: 'How do refunds work?',
    a: 'Approved refunds are credited to your Dastarkhwan Wallet or original payment method per platform policy.',
  },
];

export default function SupportCenterScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { data: tickets } = useSupportTickets();
  const totalUnread = tickets.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title="Live Help & Support"
        subtitle={totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'Direct Restaurant & Admin Chat'}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Smart Hybrid Routing Choice Cards */}
        <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>
          START A LIVE CONVERSATION
        </Text>
        <View style={styles.choiceGrid}>
          <Pressable
            onPress={() => router.push('/support/new-ticket?target=restaurant')}
            style={[
              styles.choiceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderRadius: radii.xl,
              },
            ]}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.primarySoft }]}>
              <Store size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>
                  Chat with Restaurant
                </Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 }}>
                Order delay, missing or wrong item, special cooking notes
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/support/new-ticket?target=admin')}
            style={[
              styles.choiceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.xl,
              },
            ]}
          >
            <View style={[styles.choiceIcon, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Headphones size={22} color="#2563EB" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>
                  Dastarkhwan Support Admin
                </Text>
                <ChevronRight size={16} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 }}>
                Rider help, payment, refund disputes, or app account support
              </Text>
            </View>
          </Pressable>
        </View>

        {/* My Live Support Conversations */}
        <View style={styles.rowBetween}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>My Live Chats</Text>
          {totalUnread > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{totalUnread} NEW</Text>
            </View>
          ) : null}
        </View>

        {tickets.length === 0 ? (
          <EmptyState
            title="No support conversations yet"
            description="Choose Restaurant Chat or Dastarkhwan Admin above to start a real-time chat."
          />
        ) : (
          tickets.map((t) => {
            const isRest = t.targetType === 'restaurant';
            const unread = t.unreadCount ?? 0;
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/support/ticket/${t.id}`)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: unread > 0 ? colors.primary : colors.border,
                    borderWidth: unread > 0 ? 1.5 : 1,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <View
                      style={[
                        styles.channelTag,
                        { backgroundColor: isRest ? colors.primarySoft : 'rgba(37,99,235,0.12)' },
                      ]}
                    >
                      {isRest ? (
                        <Store size={11} color={colors.primary} />
                      ) : (
                        <Headphones size={11} color="#2563EB" />
                      )}
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: isRest ? colors.primary : '#2563EB',
                        }}
                      >
                        {isRest ? t.restaurantName || 'Restaurant' : 'Super Admin'}
                      </Text>
                    </View>
                    {t.escalatedToAdmin ? (
                      <View style={styles.escalatedTag}>
                        <AlertTriangle size={10} color="#DC2626" />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                          ESCALATED
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {unread > 0 ? (
                      <View style={styles.unreadCircle}>
                        <Text style={styles.unreadCircleText}>{unread}</Text>
                      </View>
                    ) : null}
                    <StatusBadge
                      label={t.status.replace('_', ' ').toUpperCase()}
                      tone={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}
                    />
                  </View>
                </View>

                <Text style={{ fontWeight: '800', fontSize: 14.5, color: colors.textPrimary }} numberOfLines={1}>
                  {t.subject}
                </Text>

                {t.orderSummary ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <ShoppingBag size={12} color={colors.primary} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary }}>
                      Order {t.orderSummary.orderNumber} · {t.orderSummary.restaurantName}
                    </Text>
                  </View>
                ) : null}

                {t.lastMessage ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12.5 }} numberOfLines={1}>
                    {t.lastMessage}
                  </Text>
                ) : null}

                <View style={styles.rowBetween}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                    {t.ticketNumber}
                  </Text>
                  {t.rating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>
                        Rated {t.rating}/5
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}

        {/* FAQs */}
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Quick Answers</Text>
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
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.textPrimary }}>
                {item.q}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </View>
            {openFaq === idx && (
              <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                {item.a}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 36 },
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  choiceGrid: { gap: 10 },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: { fontSize: 15, fontWeight: '800' },
  heading: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  card: { padding: 14, borderWidth: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  channelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  escalatedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  unreadPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  unreadPillText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' },
  unreadCircle: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCircleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
