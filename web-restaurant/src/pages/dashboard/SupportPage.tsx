import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  Headphones,
  Plus,
  Send,
  ShoppingBag,
  Star,
  User,
  Zap,
} from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../../components/ui';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface OrderSummary {
  id: string;
  orderNumber: string;
  restaurantName: string;
  status: string;
  totalMinor: number;
  paymentMethod: string;
  itemsSummary: string;
}

interface SupportTicketRow {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  channel?: 'customer_chat' | 'admin_support';
  targetType?: 'restaurant' | 'admin';
  escalatedToAdmin?: boolean;
  closedReason?: 'inactivity' | 'resolved' | 'manual';
  activeAgentName?: string;
  inactivityMinutesLeft?: number;
  typing?: { role: string; name: string } | null;
  rating?: number;
  ratingFeedback?: string;
  userName?: string;
  userPhone?: string;
  orderSummary?: OrderSummary;
  unreadCount?: number;
  lastMessage: string;
  lastSenderRole: string;
  updatedAt: string;
}

interface SupportTicketDetail {
  ticket: SupportTicketRow;
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

const CUSTOMER_QUICK_REPLIES = [
  'Your order is being prepared fresh right now!',
  'Our rider has picked up your order and is on the way.',
  'We apologize for the delay — prioritizing your order immediately.',
  'Issue resolved! Please let us know if you need anything else.',
];

export const SupportPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<'customer_chat' | 'admin_support'>('customer_chat');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const lastTypingPingRef = useRef(0);

  const notifyTyping = (ticketId: string | null) => {
    if (!ticketId) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < 2500) return;
    lastTypingPingRef.current = now;
    void restaurantHttpClient.post(`/support/tickets/${ticketId}/typing`, {}).catch(() => {});
  };

  // New Admin Ticket Modal
  const [newOpen, setNewOpen] = useState(false);
  const [category, setCategory] = useState<'other' | 'refund' | 'missing_food' | 'wrong_order' | 'late_delivery'>('other');
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: tickets = [] } = useQuery<SupportTicketRow[]>({
    queryKey: ['restaurant', restaurantId, 'support-tickets'],
    enabled: Boolean(restaurantId),
    refetchInterval: 3000,
    queryFn: () =>
      restaurantHttpClient.get<SupportTicketRow[]>(
        `/support/tickets?restaurantId=${encodeURIComponent(restaurantId ?? '')}`
      ),
  });

  const customerChats = tickets.filter((t) => t.channel === 'customer_chat');
  const adminChats = tickets.filter((t) => t.channel !== 'customer_chat');
  const visibleTickets = tab === 'customer_chat' ? customerChats : adminChats;

  const customerUnread = customerChats.reduce((s, t) => s + (t.unreadCount ?? 0), 0);
  const adminUnread = adminChats.reduce((s, t) => s + (t.unreadCount ?? 0), 0);

  const activeId =
    visibleTickets.find((t) => t.id === selectedId)?.id ?? visibleTickets[0]?.id ?? null;

  const { data: detail, refetch: refetchDetail } = useQuery<SupportTicketDetail>({
    queryKey: ['restaurant', 'support-ticket', activeId],
    enabled: Boolean(activeId),
    refetchInterval: 3000,
    queryFn: () => restaurantHttpClient.get<SupportTicketDetail>(`/support/tickets/${activeId}`),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length]);

  const handleCreateTicket = async () => {
    if (!subject.trim() || !firstMessage.trim()) {
      showToast('Please enter subject and message');
      return;
    }
    setCreating(true);
    try {
      const created = await restaurantHttpClient.post<{ id?: string; _id?: string }>('/support/tickets', {
        targetType: 'admin',
        restaurantId: restaurantId ?? undefined,
        category,
        subject: subject.trim(),
        message: firstMessage.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'support-tickets'] });
      setTab('admin_support');
      setSelectedId(created.id ?? created._id ?? null);
      setNewOpen(false);
      setSubject('');
      setFirstMessage('');
      showToast('Live chat with Super Admin started!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (overrideText?: string) => {
    const text = (overrideText ?? reply).trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      await restaurantHttpClient.post(`/support/tickets/${activeId}/messages`, { message: text });
      if (!overrideText) setReply('');
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'support-tickets'] }),
      ]);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved') => {
    if (!activeId) return;
    try {
      await restaurantHttpClient.patch(`/support/tickets/${activeId}/status`, { status });
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'support-tickets'] }),
      ]);
      showToast(`Chat marked ${status.replace('_', ' ')}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={21} color="var(--zr-primary)" />
            Smart Live Support Desk
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Reply to live Customer order chats or message Dastarkhwan Super Admin directly.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tabs
            items={[
              {
                key: 'customer_chat',
                label: `Customer Chats (${customerChats.length})${customerUnread > 0 ? ` · ${customerUnread} new` : ''}`,
              },
              {
                key: 'admin_support',
                label: `Admin Support (${adminChats.length})${adminUnread > 0 ? ` · ${adminUnread} new` : ''}`,
              },
            ]}
            activeKey={tab}
            onChange={(k) => {
              setTab(k as 'customer_chat' | 'admin_support');
              setSelectedId(null);
            }}
          />
          <PrimaryButton leftIcon={<Plus size={15} />} onClick={() => setNewOpen(true)}>
            Contact Super Admin
          </PrimaryButton>
        </div>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="zr-card" style={{ padding: 28 }}>
          <EmptyState
            title={tab === 'customer_chat' ? 'No customer chats yet' : 'No Super Admin tickets yet'}
            description={
              tab === 'customer_chat'
                ? 'When a customer opens a live order chat for your restaurant from the mobile app, it appears here instantly.'
                : 'Click "Contact Super Admin" above for subscription, payment, or technical help.'
            }
          />
        </div>
      ) : (
        <div className="zr-split-grid">
          {/* Left Ticket List */}
          <div className="zr-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 620, overflowY: 'auto' }}>
            {visibleTickets.map((t) => {
              const selected = t.id === activeId;
              const unread = t.unreadCount ?? 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: selected
                      ? '2px solid var(--zr-primary)'
                      : unread > 0
                        ? '1.5px solid #EF4444'
                        : '1px solid var(--zr-border)',
                    background: selected ? 'rgba(244,123,32,0.08)' : 'var(--zr-surface)',
                    color: 'var(--zr-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 12.5 }}>{t.ticketNumber}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {unread > 0 ? (
                        <span
                          style={{
                            minWidth: 19,
                            height: 19,
                            borderRadius: 999,
                            background: '#EF4444',
                            color: '#FFFFFF',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 5px',
                          }}
                        >
                          {unread}
                        </span>
                      ) : null}
                      <StatusBadge
                        label={t.status.replace('_', ' ').toUpperCase()}
                        tone={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t.subject}</div>

                  {tab === 'customer_chat' ? (
                    <div style={{ fontSize: 11.5, color: 'var(--zr-text-secondary)', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <User size={11} />
                      <span>{t.userName || 'Customer'}</span>
                      {t.orderSummary ? <span>· {t.orderSummary.orderNumber}</span> : null}
                      {t.escalatedToAdmin ? (
                        <span style={{ color: '#DC2626', fontWeight: 800 }}>· ESCALATED</span>
                      ) : null}
                    </div>
                  ) : null}

                  {t.lastMessage ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--zr-text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.lastSenderRole === 'restaurant_owner' ? 'You: ' : ''}{t.lastMessage}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right Live Chat Window */}
          <div className="zr-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 540 }}>
            {detail ? (
              <>
                <div style={{ borderBottom: '1px solid var(--zr-border)', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--zr-primary)' }}>
                        {detail.ticket.ticketNumber}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#15803D',
                          background: 'rgba(22,163,74,0.12)',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
                        LIVE ONLINE
                      </span>
                      {detail.ticket.escalatedToAdmin ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 800,
                            color: '#DC2626',
                            background: 'rgba(220,38,38,0.12)',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          <AlertTriangle size={11} />
                          SUPER ADMIN JOINED
                        </span>
                      ) : null}
                    </div>
                    <h3 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 900 }}>{detail.ticket.subject}</h3>
                    {tab === 'customer_chat' ? (
                      <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                        Customer: <strong>{detail.ticket.userName || 'Customer'}</strong>
                        {detail.ticket.userPhone ? ` · ${detail.ticket.userPhone}` : ''}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {tab === 'customer_chat' ? (
                      detail.ticket.status !== 'resolved' ? (
                        <SecondaryButton
                          leftIcon={<CheckCircle2 size={14} />}
                          onClick={() => void handleStatusChange('resolved')}
                        >
                          Mark Resolved
                        </SecondaryButton>
                      ) : (
                        <SecondaryButton onClick={() => void handleStatusChange('open')}>
                          Reopen Chat
                        </SecondaryButton>
                      )
                    ) : null}
                    <StatusBadge
                      label={detail.ticket.status.replace('_', ' ').toUpperCase()}
                      tone={detail.ticket.status === 'resolved' ? 'success' : detail.ticket.status === 'in_progress' ? 'info' : 'warning'}
                    />
                  </div>
                </div>

                {/* Live Attached Order Card */}
                {detail.ticket.orderSummary ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'rgba(244,123,32,0.08)',
                      border: '1px solid rgba(244,123,32,0.28)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShoppingBag size={18} color="var(--zr-primary)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          Order {detail.ticket.orderSummary.orderNumber} · {formatMoney(detail.ticket.orderSummary.totalMinor)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                          {detail.ticket.orderSummary.itemsSummary}
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      label={detail.ticket.orderSummary.status.replace('_', ' ').toUpperCase()}
                      tone="info"
                    />
                  </div>
                ) : null}

                {/* Messages */}
                <div style={{ flex: 1, maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                  {detail.messages.map((m) => {
                    if (m.senderRole === 'system') {
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: 'center',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#92400E',
                            background: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            padding: '5px 12px',
                            borderRadius: 999,
                          }}
                        >
                          {m.message}
                        </div>
                      );
                    }
                    const isMine = m.senderRole === 'restaurant_owner';
                    const isAdmin = m.senderRole === 'super_admin';
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? '#2563EB' : 'var(--zr-text-secondary)', marginBottom: 3 }}>
                          {isMine ? 'You (Restaurant)' : isAdmin ? 'Dastarkhwan Super Admin' : m.senderName || 'Customer'}
                        </span>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: isMine ? 'var(--zr-primary)' : 'var(--zr-surface-alt)',
                            color: isMine ? '#FFFFFF' : 'var(--zr-text-primary)',
                            border: isMine ? 'none' : '1px solid var(--zr-border)',
                            fontSize: 13.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {m.message}
                        </div>
                        <span style={{ fontSize: 10.5, color: 'var(--zr-text-secondary)', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine ? (
                            m.isSeen ? (
                              <CheckCheck size={13} color="#0284C7" />
                            ) : (
                              <Check size={13} color="var(--zr-text-secondary)" />
                            )
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                  {/* Inactivity Warning / Auto-Closed Banner */}
                  {detail.ticket.status === 'closed' && detail.ticket.closedReason === 'inactivity' ? (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                      Chat auto-closed due to 15 min inactivity. Send a reply below anytime to reopen.
                    </div>
                  ) : (detail.ticket.status === 'open' || detail.ticket.status === 'in_progress') && (detail.ticket.inactivityMinutesLeft ?? 15) <= 5 ? (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: 12, fontWeight: 700 }}>
                      Idle session — will auto-close in {Math.max(1, detail.ticket.inactivityMinutesLeft ?? 1)} min if no message is sent.
                    </div>
                  ) : null}

                  {/* Live Typing Indicator */}
                  {detail.ticket.typing ? (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--zr-surface-alt)', border: '1px solid var(--zr-border)', fontSize: 12, fontWeight: 700, color: 'var(--zr-primary)' }}>
                      <span className="zr-typing-dots"><span /><span /><span /></span>
                      <span>{detail.ticket.typing.name} is typing...</span>
                    </div>
                  ) : null}
                  <div ref={chatEndRef} />
                </div>

                {/* Customer Rating Display if Rated */}
                {detail.ticket.rating ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      fontSize: 12.5,
                    }}
                  >
                    <Star size={15} color="#F59E0B" fill="#F59E0B" />
                    <strong>Customer Rating: {detail.ticket.rating}/5</strong>
                    {detail.ticket.ratingFeedback ? (
                      <span style={{ color: 'var(--zr-text-secondary)' }}>— &ldquo;{detail.ticket.ratingFeedback}&rdquo;</span>
                    ) : null}
                  </div>
                ) : null}

                {/* 1-Tap Quick Replies for Customer Chats */}
                {tab === 'customer_chat' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--zr-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Zap size={12} color="var(--zr-primary)" />
                      Quick Reply:
                    </span>
                    {CUSTOMER_QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr}
                        type="button"
                        disabled={sending}
                        onClick={() => void handleSendReply(qr)}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 999,
                          border: '1px solid var(--zr-border)',
                          background: 'var(--zr-surface-alt)',
                          color: 'var(--zr-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--zr-border)', paddingTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <InputField
                      placeholder={
                        tab === 'customer_chat'
                          ? 'Type a live reply to customer...'
                          : 'Write a message to Dastarkhwan Admin...'
                      }
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        if (e.target.value.trim()) notifyTyping(activeId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendReply();
                        }
                      }}
                    />
                  </div>
                  <PrimaryButton loading={sending} leftIcon={<Send size={15} />} onClick={() => void handleSendReply()}>
                    Send
                  </PrimaryButton>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <Modal
        open={newOpen}
        title="Contact Dastarkhwan Super Admin"
        onClose={() => setNewOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setNewOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton loading={creating} onClick={() => void handleCreateTicket()}>
              Start Live Chat
            </PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Dropdown
            label="Topic"
            value={category}
            onChange={(v) => setCategory(v as typeof category)}
            options={[
              { label: 'Subscription / Billing / General', value: 'other' },
              { label: 'Refund / Payment Help', value: 'refund' },
              { label: 'Order / Missing Item Issue', value: 'missing_food' },
              { label: 'Delivery / Rider Delay', value: 'late_delivery' },
            ]}
          />
          <InputField
            label="Subject *"
            placeholder="e.g. Payment verification or menu help"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <InputField
            label="Message *"
            placeholder="Describe how we can help..."
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
