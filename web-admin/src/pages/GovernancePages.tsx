import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCheck, Download, Edit3, Headphones, Plus, Send, ShoppingBag, Star, Store, Trash2, Zap } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui/AdminUI';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { adminHttpClient } from '../services/apiClient';
import { useAdminDashboard, useAdminList, useAdminSettings } from '../hooks/useAdminData';
import { useAdminStore } from '../store/useAdminStore';

interface LogRow { id: string; actor: string; action: string; resource: string; timestamp: string }

interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  restaurantName: string;
  status: string;
  totalMinor: number;
  paymentMethod: string;
  itemsSummary: string;
}

interface AdminSupportTicket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  targetType?: 'restaurant' | 'admin';
  restaurantName?: string;
  escalatedToAdmin?: boolean;
  closedReason?: 'inactivity' | 'resolved' | 'manual';
  activeAgentName?: string;
  inactivityMinutesLeft?: number;
  typing?: { role: string; name: string } | null;
  rating?: number;
  ratingFeedback?: string;
  orderSummary?: AdminOrderSummary;
  category: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  messageCount: number;
  unreadCount?: number;
  lastMessage: string;
  lastSenderRole: string;
  updatedAt: string;
}

interface AdminSupportDetail {
  ticket: AdminSupportTicket;
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

const ADMIN_QUICK_REPLIES = [
  'Hello! Dastarkhwan Support here — reviewing your issue right now.',
  'We have coordinated with the restaurant & rider for fastest resolution.',
  'Your refund request is under review and will reflect shortly.',
  'Glad we could help! Please rate your support experience.',
];

export const ComplaintsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'escalated' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastTypingPingRef = useRef(0);

  const notifyAdminTyping = (ticketId: string | null) => {
    if (!ticketId) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < 2500) return;
    lastTypingPingRef.current = now;
    void adminHttpClient.post(`/admin/support/tickets/${ticketId}/typing`, {}).catch(() => {});
  };

  // Create Ticket Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState<'other' | 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund'>('other');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Edit Ticket Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editCategory, setEditCategory] = useState<'other' | 'missing_food' | 'wrong_order' | 'late_delivery' | 'refund'>('other');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editStatus, setEditStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('open');

  const { data: tickets = [] } = useQuery<AdminSupportTicket[]>({
    queryKey: ['admin', 'support-tickets'],
    refetchInterval: 3000,
    queryFn: () => adminHttpClient.get<AdminSupportTicket[]>('/admin/support/tickets'),
  });

  const filtered = tickets.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'escalated') return Boolean(t.escalatedToAdmin);
    return t.status === filter;
  });
  const activeId = selectedId ?? filtered[0]?.id ?? null;

  const { data: detail, refetch: refetchDetail } = useQuery<AdminSupportDetail>({
    queryKey: ['admin', 'support-ticket', activeId],
    enabled: Boolean(activeId),
    refetchInterval: 3000,
    queryFn: () => adminHttpClient.get<AdminSupportDetail>(`/admin/support/tickets/${activeId}`),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length]);

  const handleSendReply = async (overrideText?: string) => {
    const text = (overrideText ?? reply).trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      await adminHttpClient.post(`/admin/support/tickets/${activeId}/messages`, { message: text });
      if (!overrideText) setReply('');
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!activeId) return;
    try {
      await adminHttpClient.patch(`/admin/support/tickets/${activeId}/status`, { status });
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
      showToast(`Ticket marked ${status.replace('_', ' ')}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update status');
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      showToast('Subject and initial message are required');
      return;
    }
    try {
      const created = await adminHttpClient.post<{ id: string }>('/admin/support/tickets', {
        userEmail: newEmail.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        subject: newSubject.trim(),
        message: newMessage.trim(),
      });
      setCreateOpen(false);
      setNewEmail('');
      setNewSubject('');
      setNewMessage('');
      setSelectedId(created.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
      showToast('Support ticket created!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to create ticket');
    }
  };

  const openEditTicket = () => {
    if (!detail?.ticket) return;
    setEditSubject(detail.ticket.subject);
    setEditCategory((detail.ticket.category as typeof editCategory) ?? 'other');
    setEditPriority(detail.ticket.priority ?? 'medium');
    setEditStatus(detail.ticket.status);
    setEditOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!activeId || !editSubject.trim()) return;
    try {
      await adminHttpClient.patch(`/admin/support/tickets/${activeId}`, {
        subject: editSubject.trim(),
        category: editCategory,
        priority: editPriority,
        status: editStatus,
      });
      setEditOpen(false);
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
      showToast('Ticket updated!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update ticket');
    }
  };

  const handleDeleteTicket = async () => {
    if (!activeId) return;
    if (!window.confirm('Delete this support ticket and all of its messages?')) return;
    try {
      await adminHttpClient.del(`/admin/support/tickets/${activeId}`);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
      showToast('Ticket deleted');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to delete ticket');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeId) return;
    try {
      await adminHttpClient.del(`/admin/support/tickets/${activeId}/messages/${messageId}`);
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
      ]);
      showToast('Message deleted');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to delete message');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={20} color="#F47B20" />
            Live Support Chat &amp; Customer Complaints
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Real-time two-way support inbox for Customers, Riders &amp; Restaurant Owners (auto-syncs every 3s).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tabs
            items={[
              { key: 'all', label: `All (${tickets.length})` },
              { key: 'escalated', label: `Escalated (${tickets.filter((t) => t.escalatedToAdmin).length})` },
              { key: 'open', label: `Open (${tickets.filter((t) => t.status === 'open').length})` },
              { key: 'in_progress', label: `In Progress (${tickets.filter((t) => t.status === 'in_progress').length})` },
              { key: 'resolved', label: `Resolved (${tickets.filter((t) => t.status === 'resolved').length})` },
            ]}
            activeKey={filter}
            onChange={(k) => setFilter(k as 'all' | 'escalated' | 'open' | 'in_progress' | 'resolved')}
          />
          <PrimaryButton leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            New Ticket
          </PrimaryButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="zr-card" style={{ padding: 28 }}>
          <EmptyState
            title="No support tickets in this view"
            description="When a customer, rider, or restaurant owner opens a support ticket, it will appear here in real time."
          />
        </div>
      ) : (
        <div className="zr-split-grid">
          {/* Left Ticket Inbox */}
          <div className="zr-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 620, overflowY: 'auto' }}>
            {filtered.map((t) => {
              const selected = t.id === activeId;
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
                    border: selected ? '2px solid #F47B20' : '1px solid var(--zr-border)',
                    background: selected ? 'rgba(244,123,32,0.08)' : 'var(--zr-surface)',
                    color: 'var(--zr-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 13 }}>{t.ticketNumber}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {(t.unreadCount ?? 0) > 0 ? (
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
                          {t.unreadCount}
                        </span>
                      ) : null}
                      <StatusBadge
                        label={t.status.replace('_', ' ').toUpperCase()}
                        tone={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {t.targetType === 'restaurant' ? (
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#EA580C', background: 'rgba(244,123,32,0.12)', padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Store size={10} />
                        {t.restaurantName || 'Restaurant'}
                      </span>
                    ) : null}
                    {t.escalatedToAdmin ? (
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#DC2626', background: 'rgba(220,38,38,0.12)', padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={10} />
                        ESCALATED
                      </span>
                    ) : null}
                    {t.rating ? (
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#B45309', background: 'rgba(245,158,11,0.14)', padding: '2px 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Star size={10} fill="#F59E0B" color="#F59E0B" />
                        {t.rating}/5
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                    {t.userName} {t.userEmail ? `· ${t.userEmail}` : ''}
                  </div>
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
                      {t.lastSenderRole === 'super_admin' ? 'You: ' : ''}{t.lastMessage}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right Live Chat Window */}
          <div className="zr-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 540 }}>
            {detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--zr-border)', paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#F47B20' }}>
                      {detail.ticket.ticketNumber} · {detail.ticket.category.replace('_', ' ').toUpperCase()}
                    </div>
                    <h3 style={{ margin: '2px 0', fontSize: 17, fontWeight: 900 }}>{detail.ticket.subject}</h3>
                    <div style={{ fontSize: 12.5, color: 'var(--zr-text-secondary)' }}>
                      {detail.ticket.userName} · {detail.ticket.userEmail} {detail.ticket.userPhone ? `· ${detail.ticket.userPhone}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                      <SecondaryButton
                        key={st}
                        onClick={() => void handleStatusChange(st)}
                      >
                        {st === detail.ticket.status ? `✓ ${st.replace('_', ' ')}` : st.replace('_', ' ')}
                      </SecondaryButton>
                    ))}
                    <SecondaryButton leftIcon={<Edit3 size={13} />} onClick={openEditTicket}>
                      Edit
                    </SecondaryButton>
                    <SecondaryButton leftIcon={<Trash2 size={13} />} onClick={() => void handleDeleteTicket()}>
                      Delete
                    </SecondaryButton>
                  </div>
                </div>

                {/* Attached Live Order Card */}
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
                      <ShoppingBag size={18} color="#F47B20" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          Order {detail.ticket.orderSummary.orderNumber} · {detail.ticket.orderSummary.restaurantName} · {formatMoney(detail.ticket.orderSummary.totalMinor)}
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

                <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
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
                    const isAdmin = m.senderRole === 'super_admin';
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--zr-text-secondary)', marginBottom: 3 }}>
                          {isAdmin ? 'Super Admin (You)' : `${m.senderName} (${m.senderRole.replace('_', ' ')})`}
                        </span>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: isAdmin ? '#F47B20' : 'var(--zr-surface-alt)',
                            color: isAdmin ? '#FFFFFF' : 'var(--zr-text-primary)',
                            border: isAdmin ? 'none' : '1px solid var(--zr-border)',
                            fontSize: 13.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {m.message}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 10.5, color: 'var(--zr-text-secondary)' }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isAdmin ? (
                            m.isSeen ? (
                              <CheckCheck size={13} color="#0284C7" />
                            ) : (
                              <Check size={13} color="var(--zr-text-secondary)" />
                            )
                          ) : null}
                          <button
                            type="button"
                            title="Delete message"
                            onClick={() => void handleDeleteMessage(m.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#DC2626',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'inline-flex',
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {detail.ticket.status === 'closed' && detail.ticket.closedReason === 'inactivity' ? (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12, fontWeight: 700 }}>
                      Chat auto-closed due to 15 min inactivity. Send a reply below anytime to reopen.
                    </div>
                  ) : (detail.ticket.status === 'open' || detail.ticket.status === 'in_progress') && (detail.ticket.inactivityMinutesLeft ?? 15) <= 5 ? (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: 12, fontWeight: 700 }}>
                      Idle session — will auto-close in {Math.max(1, detail.ticket.inactivityMinutesLeft ?? 1)} min if inactive.
                    </div>
                  ) : null}

                  {detail.ticket.typing ? (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--zr-surface-alt)', border: '1px solid var(--zr-border)', fontSize: 12, fontWeight: 700, color: '#F47B20' }}>
                      <span className="zr-typing-dots"><span /><span /><span /></span>
                      <span>{detail.ticket.typing.name} is typing...</span>
                    </div>
                  ) : null}
                  <div ref={chatEndRef} />
                </div>

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
                    <strong>User Support Rating: {detail.ticket.rating}/5</strong>
                    {detail.ticket.ratingFeedback ? (
                      <span style={{ color: 'var(--zr-text-secondary)' }}>— &ldquo;{detail.ticket.ratingFeedback}&rdquo;</span>
                    ) : null}
                  </div>
                ) : null}

                {/* 1-Tap Quick Replies */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--zr-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={12} color="#F47B20" />
                    Quick Reply:
                  </span>
                  {ADMIN_QUICK_REPLIES.map((qr) => (
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

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--zr-border)', paddingTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <InputField
                      placeholder="Type live reply to customer / restaurant..."
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        if (e.target.value.trim()) notifyAdminTyping(activeId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendReply();
                        }
                      }}
                    />
                  </div>
                  <PrimaryButton
                    disabled={sending}
                    leftIcon={<Send size={15} />}
                    onClick={() => void handleSendReply()}
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </PrimaryButton>
                </div>
              </>
            ) : (
              <EmptyState title="Select a conversation" description="Pick any ticket on the left to start chatting live." />
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        open={createOpen}
        title="Create New Support Ticket"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleCreateTicket()}>Create &amp; Send</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField
            label="Target User Email (Customer / Rider / Owner — optional)"
            placeholder="e.g. customer@zestroute.app or catalog-partner@zestroute.app"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Dropdown
              label="Category"
              value={newCategory}
              onChange={(v) => setNewCategory(v as typeof newCategory)}
              options={[
                { label: 'General / Other', value: 'other' },
                { label: 'Missing Food', value: 'missing_food' },
                { label: 'Wrong Order', value: 'wrong_order' },
                { label: 'Late Delivery', value: 'late_delivery' },
                { label: 'Refund / Billing', value: 'refund' },
              ]}
            />
            <Dropdown
              label="Priority"
              value={newPriority}
              onChange={(v) => setNewPriority(v as typeof newPriority)}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
              ]}
            />
          </div>
          <InputField label="Subject *" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ticket subject" />
          <InputField label="Initial Message *" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write first message..." />
        </div>
      </Modal>

      {/* Edit Ticket Modal */}
      <Modal
        open={editOpen}
        title="Edit Support Ticket"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleUpdateTicket()}>Save Changes</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Subject *" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          <Dropdown
            label="Category"
            value={editCategory}
            onChange={(v) => setEditCategory(v as typeof editCategory)}
            options={[
              { label: 'General / Other', value: 'other' },
              { label: 'Missing Food', value: 'missing_food' },
              { label: 'Wrong Order', value: 'wrong_order' },
              { label: 'Late Delivery', value: 'late_delivery' },
              { label: 'Refund / Billing', value: 'refund' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Dropdown
              label="Priority"
              value={editPriority}
              onChange={(v) => setEditPriority(v as typeof editPriority)}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
              ]}
            />
            <Dropdown
              label="Status"
              value={editStatus}
              onChange={(v) => setEditStatus(v as typeof editStatus)}
              options={[
                { label: 'Open', value: 'open' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Closed', value: 'closed' },
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState('monthly');
  const { data } = useAdminDashboard();

  const metrics = [
    { label: 'Total Customers', value: String(data.totalCustomers) },
    { label: 'Total Restaurants', value: String(data.totalRestaurants) },
    { label: 'Total Riders', value: String(data.totalRiders) },
    { label: 'Total Orders', value: String(data.totalOrders) },
    { label: 'Completed Orders', value: String(data.completedOrders) },
    { label: 'Cancelled Orders', value: String(data.cancelledOrders) },
    { label: 'Gross Order Value', value: formatMoney(data.grossOrderValueMinor) },
    { label: 'Platform Commissions', value: formatMoney(data.totalCommissionsMinor) },
  ];

  const handleExportCsv = () => {
    const csv = [['Metric', 'Value'], ...metrics.map((m) => [m.label, m.value])]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dastarkhwan-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Analytics CSV report downloaded!');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank', 'width=760,height=640');
    if (!win) {
      window.print();
      return;
    }
    const rows = metrics.map((m) => `<tr><td>${m.label}</td><td><strong>${m.value}</strong></td></tr>`).join('');
    win.document.write(`<!doctype html><html><head><title>Dastarkhwan Platform Analytics (${period})</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}h2{color:#F47B20}table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #ddd;padding:10px;font-size:14px}</style>
      </head><body><h2>Dastarkhwan Platform Analytics (${period.toUpperCase()})</h2>
      <p>Generated ${new Date().toLocaleString()}</p>
      <table><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          items={[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'yearly', label: 'Yearly' },
          ]}
          activeKey={period}
          onChange={setPeriod}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton leftIcon={<Download size={16} />} onClick={handleExportCsv}>
            Export CSV / Excel
          </SecondaryButton>
          <PrimaryButton leftIcon={<Download size={16} />} onClick={handleExportPdf}>
            Export PDF
          </PrimaryButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {metrics.map((m) => (
          <div key={m.label} className="zr-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AuditLogsPage: React.FC = () => {
  const { data } = useAdminList<LogRow>('audit-logs');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Immutable Security Audit Logs</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
          Every sensitive admin modification, approval, suspension, and financial action is logged permanently.
        </p>
      </div>
      <DataTable
        columns={[
          { key: 'actor', header: 'Actor', render: (r) => <strong>{r.actor}</strong> },
          { key: 'action', header: 'Action', render: (r) => <StatusBadge label={r.action} tone="primary" /> },
          { key: 'res', header: 'Resource', render: (r) => r.resource },
          { key: 'time', header: 'Timestamp', render: (r) => r.timestamp },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No audit events recorded yet" description="Server-side audit middleware records events in Phase 7 & 12." />}
      />
    </div>
  );
};

export const PlatformSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { theme, locale, toggleTheme, toggleLocale } = useAdminStore();
  const { data: settings } = useAdminSettings();
  const [appName, setAppName] = useState('Dastarkhwan');
  const [taxPct, setTaxPct] = useState('0');
  const [minOrderPkr, setMinOrderPkr] = useState('300');
  const [commissionPct, setCommissionPct] = useState('15');

  useEffect(() => {
    if (!settings) return;
    if (settings.appName) setAppName(settings.appName);
    if (settings.taxBps !== undefined) setTaxPct(String(settings.taxBps / 100));
    if (settings.minOrderMinor !== undefined) setMinOrderPkr(String(settings.minOrderMinor / 100));
    if (settings.defaultCommissionBps !== undefined) {
      setCommissionPct(String(settings.defaultCommissionBps / 100));
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await adminHttpClient.patch('/admin/settings', {
        appName,
        taxBps: Math.round(Number(taxPct) * 100),
        minOrderMinor: Math.round(Number(minOrderPkr) * 100),
        defaultCommissionBps: Math.round(Number(commissionPct) * 100),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      showToast('Platform settings saved to MongoDB!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save settings');
    }
  };

  return (
    <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Platform Configuration &amp; Policies</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <InputField label="Application Name" value={appName} onChange={(e) => setAppName(e.target.value)} />
        <InputField label="Default Currency" defaultValue="PKR" disabled />
        <InputField label="Tax Rate (%)" type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
        <InputField label="Minimum Order (PKR)" type="number" value={minOrderPkr} onChange={(e) => setMinOrderPkr(e.target.value)} />
        <InputField label="Default Commission (%)" type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
        <InputField label="Support Email" defaultValue="support@zestroute.app" />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PrimaryButton onClick={handleSaveSettings}>
          Save Platform Settings
        </PrimaryButton>
        <SecondaryButton onClick={toggleTheme}>
          Theme: {theme === 'light' ? 'Light -> Dark' : 'Dark -> Light'}
        </SecondaryButton>
        <SecondaryButton onClick={toggleLocale}>
          Language: {locale === 'en' ? 'English -> اردو (RTL)' : 'اردو -> English'}
        </SecondaryButton>
      </div>
    </div>
  );
};
