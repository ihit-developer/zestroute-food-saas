import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  Headphones,
  Send,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react-native';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { useTheme } from '../../../hooks/useTheme';
import {
  EmptyState,
  IconButton,
  LoadingSkeleton,
  PrimaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../../components/ui';
import { httpClient } from '../../../services/apiClient';
import { useAppStore } from '../../../store/useAppStore';
import type { SupportOrderSummary } from '../../../hooks/useCustomerData';

interface SupportTicketDetail {
  ticket: {
    id: string;
    ticketNumber: string;
    category: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    targetType?: 'restaurant' | 'admin';
    restaurantName?: string;
    escalatedToAdmin?: boolean;
    closedReason?: 'inactivity' | 'resolved' | 'manual';
    activeAgentName?: string;
    inactivityMinutesLeft?: number;
    typing?: { role: string; name: string } | null;
    rating?: number;
    ratingFeedback?: string;
    orderSummary?: SupportOrderSummary;
    createdAt: string;
  };
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    isSeen?: boolean;
    createdAt: string;
  }>;
}

export default function SupportChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const user = useAppStore((s) => s.user);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [pickedStars, setPickedStars] = useState(5);
  const [ratingNote, setRatingNote] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const lastTypingPingRef = useRef(0);

  const notifyTyping = () => {
    if (!id) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < 2500) return;
    lastTypingPingRef.current = now;
    void httpClient.post(`/support/tickets/${id}/typing`, {}).catch(() => {});
  };

  const { data, isLoading, refetch } = useQuery<SupportTicketDetail>({
    queryKey: ['customer', 'support-ticket', id],
    enabled: Boolean(id),
    refetchInterval: 2500,
    queryFn: () => httpClient.get<SupportTicketDetail>(`/support/tickets/${id}`),
  });

  useEffect(() => {
    if ((data?.messages?.length ?? 0) > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [data?.messages?.length]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    try {
      await httpClient.post(`/support/tickets/${id}/messages`, { message: trimmed });
      setMessage('');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['customer', 'support-tickets'] });
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async () => {
    if (!id || escalating) return;
    setEscalating(true);
    try {
      await httpClient.post(`/support/tickets/${id}/escalate`, {});
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['customer', 'support-tickets'] });
      showToast('Escalated! Dastarkhwan Super Admin has joined this chat.', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to escalate chat', 'error');
    } finally {
      setEscalating(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!id || submittingRating) return;
    setSubmittingRating(true);
    try {
      await httpClient.post(`/support/tickets/${id}/rate`, {
        rating: pickedStars,
        feedback: ratingNote.trim() || undefined,
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['customer', 'support-tickets'] });
      showToast('Thank you for rating Dastarkhwan Support!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Could not save rating', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const ticket = data?.ticket;
  const isRestaurantChat = ticket?.targetType === 'restaurant';
  const isResolved = ticket?.status === 'resolved' || ticket?.status === 'closed';

  const statusTone =
    ticket?.status === 'resolved'
      ? 'success'
      : ticket?.status === 'in_progress'
        ? 'info'
        : ticket?.status === 'closed'
          ? 'neutral'
          : 'warning';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={ticket?.ticketNumber ?? 'Live Support'}
        subtitle={ticket?.subject ?? 'Real-Time Support Chat'}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          ticket ? (
            <StatusBadge label={ticket.status.replace('_', ' ').toUpperCase()} tone={statusTone} />
          ) : undefined
        }
      />

      {/* Online Status + 1-Tap Escalate Bar */}
      <View
        style={[
          styles.liveBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.liveDot} />
        {isRestaurantChat ? (
          <Store size={14} color={colors.primary} />
        ) : (
          <Headphones size={14} color="#2563EB" />
        )}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
          {ticket?.typing
            ? `${ticket.typing.name} is typing...`
            : ticket?.activeAgentName
              ? `Live Agent: ${ticket.activeAgentName} · Online`
              : isRestaurantChat
                ? `${ticket?.restaurantName || 'Restaurant'} · Live Agent`
                : 'Dastarkhwan Live Agent · Online'}
        </Text>

        {isRestaurantChat && !ticket?.escalatedToAdmin ? (
          <Pressable
            disabled={escalating}
            onPress={() => void handleEscalate()}
            style={styles.escalateBtn}
          >
            <AlertTriangle size={12} color="#DC2626" />
            <Text style={styles.escalateText}>
              {escalating ? 'Escalating...' : 'Escalate to Admin'}
            </Text>
          </Pressable>
        ) : ticket?.escalatedToAdmin ? (
          <View style={styles.escalatedPill}>
            <AlertTriangle size={11} color="#DC2626" />
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
              Admin Joined
            </Text>
          </View>
        ) : null}
      </View>

      {/* Inactivity Auto-Close Warning or Closed Banner */}
      {ticket && (ticket.status === 'open' || ticket.status === 'in_progress') && (ticket.inactivityMinutesLeft ?? 15) <= 5 ? (
        <View style={styles.inactivityWarn}>
          <AlertTriangle size={13} color="#B45309" />
          <Text style={styles.inactivityWarnText}>
            No recent activity — chat will auto-close in {Math.max(1, ticket.inactivityMinutesLeft ?? 1)} min
          </Text>
        </View>
      ) : null}

      {ticket?.status === 'closed' && ticket.closedReason === 'inactivity' ? (
        <View style={styles.inactivityClosed}>
          <AlertTriangle size={13} color="#DC2626" />
          <Text style={styles.inactivityClosedText}>
            Chat auto-closed due to inactivity. Send a message below anytime to reopen.
          </Text>
        </View>
      ) : null}

      {/* Live Attached Order Card */}
      {ticket?.orderSummary ? (
        <View
          style={[
            styles.orderBanner,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <View style={[styles.orderIconBox, { backgroundColor: colors.primarySoft }]}>
            <ShoppingBag size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textPrimary }}>
                {ticket.orderSummary.orderNumber} · {ticket.orderSummary.restaurantName}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
                {formatMoney(ticket.orderSummary.totalMinor)}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: colors.textSecondary }} numberOfLines={1}>
              {ticket.orderSummary.itemsSummary} · {ticket.orderSummary.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <LoadingSkeleton height={140} />
          ) : !data || data.messages.length === 0 ? (
            <EmptyState
              title="Start chatting live"
              description="Type your message below — support will reply right here in real time."
            />
          ) : (
            data.messages.map((m) => {
              if (m.senderRole === 'system') {
                return (
                  <View key={m.id} style={styles.systemPill}>
                    <AlertTriangle size={12} color="#B45309" />
                    <Text style={styles.systemText}>{m.message}</Text>
                  </View>
                );
              }
              const isAdmin = m.senderRole === 'super_admin';
              const isRestaurant = m.senderRole === 'restaurant_owner';
              const isMine = !isAdmin && !isRestaurant && (m.senderId === user?.id || m.senderRole === 'customer' || m.senderRole === 'rider');

              const senderLabel = isAdmin
                ? 'Dastarkhwan Admin'
                : isRestaurant
                  ? ticket?.restaurantName || m.senderName || 'Restaurant'
                  : 'You';

              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleWrap,
                    { alignItems: isMine ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: isAdmin ? '#2563EB' : isRestaurant ? colors.primary : colors.textSecondary,
                      marginBottom: 3,
                      marginHorizontal: 4,
                    }}
                  >
                    {senderLabel}
                  </Text>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isMine ? colors.primary : colors.surface,
                        borderColor: isMine ? colors.primary : colors.border,
                        borderRadius: radii.lg,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: isMine ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {m.message}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary,
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isMine ? (
                        m.isSeen ? (
                          <CheckCheck size={13} color="#BAE6FD" />
                        ) : (
                          <Check size={13} color="rgba(255,255,255,0.75)" />
                        )
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Live Agent Typing Bubble */}
          {ticket?.typing ? (
            <View style={[styles.bubbleWrap, { alignItems: 'flex-start' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 3, marginHorizontal: 4 }}>
                {ticket.typing.name}
              </Text>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
              >
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, { opacity: 0.65 }]} />
                <View style={[styles.typingDot, { opacity: 0.35 }]} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginLeft: 4 }}>
                  typing...
                </Text>
              </View>
            </View>
          ) : null}

          {/* 1–5 Star Post-Chat Support Rating Card */}
          {isResolved && ticket ? (
            <View
              style={[
                styles.ratingCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
              ]}
            >
              {ticket.rating ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    Thanks for your feedback!
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={20}
                        color="#F59E0B"
                        fill={s <= (ticket.rating ?? 0) ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                  </View>
                  {ticket.ratingFeedback ? (
                    <Text style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' }}>
                      &ldquo;{ticket.ratingFeedback}&rdquo;
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>
                    How was your support experience?
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Pressable key={s} onPress={() => setPickedStars(s)} hitSlop={6}>
                        <Star
                          size={28}
                          color="#F59E0B"
                          fill={s <= pickedStars ? '#F59E0B' : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={[
                      styles.ratingInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        borderRadius: radii.md,
                      },
                    ]}
                    placeholder="Optional comment..."
                    placeholderTextColor={colors.textSecondary}
                    value={ratingNote}
                    onChangeText={setRatingNote}
                  />
                  <PrimaryButton
                    title={`Submit ${pickedStars}-Star Rating`}
                    fullWidth
                    loading={submittingRating}
                    onPress={() => void handleSubmitRating()}
                  />
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: radii.lg,
              },
            ]}
            placeholder={
              isRestaurantChat
                ? `Message ${ticket?.restaurantName || 'restaurant'}...`
                : 'Message Dastarkhwan support...'
            }
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={(val) => {
              setMessage(val);
              if (val.trim()) notifyTyping();
            }}
            multiline
            maxLength={1000}
          />
          <Pressable
            disabled={sending || !message.trim()}
            onPress={() => void handleSend()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: sending || !message.trim() ? colors.border : colors.primary,
                borderRadius: radii.md,
              },
            ]}
          >
            <Send size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  escalateText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  escalatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  orderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 24 },
  systemPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  systemText: { fontSize: 11.5, fontWeight: '700', color: '#92400E' },
  bubbleWrap: { width: '100%' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  ratingCard: {
    marginTop: 10,
    padding: 16,
    borderWidth: 1,
  },
  ratingInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  inactivityWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  inactivityWarnText: { fontSize: 11.5, fontWeight: '700', color: '#92400E', flex: 1 },
  inactivityClosed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  inactivityClosedText: { fontSize: 11.5, fontWeight: '700', color: '#991B1B', flex: 1 },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F47B20',
  },
  composer: {
    padding: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
