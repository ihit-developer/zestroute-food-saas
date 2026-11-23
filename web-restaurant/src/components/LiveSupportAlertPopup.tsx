import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Headphones, MessageSquare, X } from 'lucide-react';
import { restaurantHttpClient, restaurantTokenStorage } from '../services/apiClient';
import { useRestaurantStore } from '../store/useRestaurantStore';

interface SupportAlertTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  userName?: string;
  channel?: 'customer_chat' | 'admin_support';
  lastMessage?: string;
  lastSenderRole?: string;
  unreadCount?: number;
  updatedAt: string;
}

const AUTO_DISMISS_MS = 7000;

function playSupportChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.11);
      gain.gain.setValueAtTime(0.11, ctx.currentTime + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.11 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.11);
      osc.stop(ctx.currentTime + i * 0.11 + 0.3);
    });
  } catch {
    // Autoplay policy
  }
}

export const LiveSupportAlertPopup: React.FC = () => {
  const navigate = useNavigate();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const initializedRef = useRef(false);
  const seenStampRef = useRef<Map<string, string>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [alerts, setAlerts] = useState<SupportAlertTicket[]>([]);

  const { data: tickets = [] } = useQuery<SupportAlertTicket[]>({
    queryKey: ['restaurant', restaurantId, 'support-tickets'],
    enabled: Boolean(restaurantId && restaurantTokenStorage.getAccessToken()),
    refetchInterval: 4000,
    queryFn: () =>
      restaurantHttpClient.get<SupportAlertTicket[]>(
        `/support/tickets?restaurantId=${encodeURIComponent(restaurantId ?? '')}`
      ),
  });

  const clearTimer = (id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  };

  const dismiss = (id: string) => {
    clearTimer(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    initializedRef.current = false;
    seenStampRef.current.clear();
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setAlerts([]);
  }, [restaurantId]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      tickets.forEach((t) => seenStampRef.current.set(t.id, `${t.updatedAt}:${t.lastMessage ?? ''}`));
      initializedRef.current = true;
      return;
    }

    const fresh: SupportAlertTicket[] = [];
    for (const t of tickets) {
      const stamp = `${t.updatedAt}:${t.lastMessage ?? ''}`;
      const prevStamp = seenStampRef.current.get(t.id);
      if (stamp !== prevStamp) {
        seenStampRef.current.set(t.id, stamp);
        if ((t.unreadCount ?? 0) > 0 && t.lastSenderRole !== 'restaurant_owner') {
          fresh.push(t);
        }
      }
    }

    if (fresh.length > 0) {
      fresh.forEach((t) => {
        clearTimer(t.id);
        const timer = setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS);
        timersRef.current.set(t.id, timer);
      });
      playSupportChime();
      setAlerts((prev) => {
        const ids = new Set(fresh.map((f) => f.id));
        return [...fresh, ...prev.filter((p) => !ids.has(p.id))].slice(0, 2);
      });
    }
  }, [tickets]);

  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        right: 22,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 355,
        maxWidth: 'calc(100vw - 28px)',
      }}
    >
      {alerts.map((t) => (
        <div
          key={t.id}
          className="zr-order-popup"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            borderRadius: 16,
            padding: 15,
            border: '1.5px solid rgba(59, 130, 246, 0.75)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.42)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Headphones size={17} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#93C5FD', letterSpacing: '0.08em' }}>
                  {t.channel === 'customer_chat' ? 'NEW CUSTOMER LIVE CHAT' : 'DASTARKHWAN ADMIN REPLY'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 900 }}>
                  {t.userName || 'Customer'} · {t.ticketNumber}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss support alert"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#CBD5E1',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '8px 11px',
              fontSize: 12.5,
              color: '#E2E8F0',
              lineHeight: 1.4,
            }}
          >
            {t.lastMessage || t.subject}
          </div>

          <button
            type="button"
            onClick={() => {
              dismiss(t.id);
              navigate('/support');
            }}
            className="zr-btn zr-btn-primary"
            style={{ width: '100%', minHeight: 35, fontSize: 12.5 }}
          >
            <MessageSquare size={14} />
            <span>Open Live Chat</span>
          </button>

          <div className="zr-popup-timer-track">
            <div className="zr-popup-timer-bar" />
          </div>
        </div>
      ))}
    </div>
  );
};
