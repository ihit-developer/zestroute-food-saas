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
import { ArrowLeft, Headphones, Send } from 'lucide-react-native';
import { ApiClientError } from '@zestroute/shared';
import { useTheme } from '../../../hooks/useTheme';
import {
  EmptyState,
  IconButton,
  LoadingSkeleton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../../components/ui';
import { httpClient } from '../../../services/apiClient';
import { useAppStore } from '../../../store/useAppStore';

interface SupportTicketDetail {
  ticket: {
    id: string;
    ticketNumber: string;
    category: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: string;
  };
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
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

  const { data, isLoading, refetch } = useQuery<SupportTicketDetail>({
    queryKey: ['customer', 'support-ticket', id],
    enabled: Boolean(id),
    refetchInterval: 3000,
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

  const statusTone =
    data?.ticket.status === 'resolved'
      ? 'success'
      : data?.ticket.status === 'in_progress'
        ? 'info'
        : data?.ticket.status === 'closed'
          ? 'neutral'
          : 'warning';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={data?.ticket.ticketNumber ?? 'Live Support'}
        subtitle={data?.ticket.subject ?? 'Real-Time Support Chat'}
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          data?.ticket ? (
            <StatusBadge label={data.ticket.status.replace('_', ' ').toUpperCase()} tone={statusTone} />
          ) : undefined
        }
      />

      {/* Live Sync Pill */}
      <View
        style={[
          styles.liveBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.liveDot} />
        <Headphones size={14} color={colors.primary} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, flex: 1 }}>
          Connected live to Dastarkhwan Support · Auto-syncing messages
        </Text>
      </View>

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
              title="Start chatting with Support"
              description="Type your message below — our team will reply right here in real time."
            />
          ) : (
            data.messages.map((m) => {
              const isAdmin = m.senderRole === 'super_admin';
              const isMine = !isAdmin && (m.senderId === user?.id || m.senderRole !== 'super_admin');
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
                      color: isAdmin ? colors.primary : colors.textSecondary,
                      marginBottom: 3,
                      marginHorizontal: 4,
                    }}
                  >
                    {isAdmin ? 'Dastarkhwan Support' : m.senderName || 'You'}
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
                    <Text
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        alignSelf: 'flex-end',
                        color: isMine ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
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
            placeholder="Write a message to support..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  scroll: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 24 },
  bubbleWrap: { width: '100%' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
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
