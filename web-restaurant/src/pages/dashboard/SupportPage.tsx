import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Headphones, Plus, Send } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { restaurantHttpClient } from '../../services/apiClient';

interface SupportTicketRow {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
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
    createdAt: string;
  }>;
}

export const SupportPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  // New Ticket Modal
  const [newOpen, setNewOpen] = useState(false);
  const [category, setCategory] = useState<'other' | 'refund' | 'missing_food' | 'wrong_order' | 'late_delivery'>('other');
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: tickets = [] } = useQuery<SupportTicketRow[]>({
    queryKey: ['restaurant', 'support-tickets'],
    refetchInterval: 3000,
    queryFn: () => restaurantHttpClient.get<SupportTicketRow[]>('/support/tickets'),
  });

  const activeId = selectedId ?? tickets[0]?.id ?? null;

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
        category,
        subject: subject.trim(),
        message: firstMessage.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', 'support-tickets'] });
      setSelectedId(created.id ?? created._id ?? null);
      setNewOpen(false);
      setSubject('');
      setFirstMessage('');
      showToast('Live support conversation started!');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      await restaurantHttpClient.post(`/support/tickets/${activeId}/messages`, { message: text });
      setReply('');
      await Promise.all([
        refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['restaurant', 'support-tickets'] }),
      ]);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={22} color="var(--zr-primary)" />
            Live Partner Support
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--zr-text-secondary)' }}>
            Chat live with Dastarkhwan Super Admin for subscription, payment verification, order, or technical support.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={15} />} onClick={() => setNewOpen(true)}>
          New Support Chat
        </PrimaryButton>
      </div>

      {tickets.length === 0 ? (
        <div className="zr-card" style={{ padding: 28 }}>
          <EmptyState
            title="No support conversations yet"
            description="Click 'New Support Chat' above to message the Dastarkhwan Super Admin team live."
          />
        </div>
      ) : (
        <div className="zr-split-grid">
          <div className="zr-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 580, overflowY: 'auto' }}>
            {tickets.map((t) => {
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
                    border: selected ? '2px solid var(--zr-primary)' : '1px solid var(--zr-border)',
                    background: selected ? 'rgba(244,123,32,0.08)' : 'var(--zr-surface)',
                    color: 'var(--zr-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 12.5 }}>{t.ticketNumber}</strong>
                    <StatusBadge
                      label={t.status.replace('_', ' ').toUpperCase()}
                      tone={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}
                    />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t.subject}</div>
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
                      {t.lastSenderRole === 'super_admin' ? 'Admin: ' : 'You: '}{t.lastMessage}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="zr-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 500 }}>
            {detail ? (
              <>
                <div style={{ borderBottom: '1px solid var(--zr-border)', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--zr-primary)' }}>{detail.ticket.ticketNumber}</div>
                    <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 900 }}>{detail.ticket.subject}</h3>
                  </div>
                  <StatusBadge
                    label={detail.ticket.status.replace('_', ' ').toUpperCase()}
                    tone={detail.ticket.status === 'resolved' ? 'success' : detail.ticket.status === 'in_progress' ? 'info' : 'warning'}
                  />
                </div>

                <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detail.messages.map((m) => {
                    const isAdmin = m.senderRole === 'super_admin';
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                          maxWidth: '78%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--zr-text-secondary)', marginBottom: 3 }}>
                          {isAdmin ? 'Dastarkhwan Support' : 'You'}
                        </span>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: isAdmin ? 'var(--zr-surface-alt)' : 'var(--zr-primary)',
                            color: isAdmin ? 'var(--zr-text-primary)' : '#FFFFFF',
                            border: isAdmin ? '1px solid var(--zr-border)' : 'none',
                            fontSize: 13.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {m.message}
                        </div>
                        <span style={{ fontSize: 10.5, color: 'var(--zr-text-secondary)', marginTop: 2 }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--zr-border)', paddingTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <InputField
                      placeholder="Write a message to Dastarkhwan Admin..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
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
        title="Start Live Support Chat"
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
