import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { restaurantHttpClient, restaurantTokenStorage } from '../services/apiClient';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useToast } from './ui';

interface IncomingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemsSummary: string;
  totalMinor: number;
  paymentMethod: string;
  deliveryAddress: string;
  status: string;
  createdAt: string;
}

function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [587.33, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.11);
      gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.11 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.11);
      osc.stop(ctx.currentTime + i * 0.11 + 0.35);
    });
  } catch {
    // Browser autoplay policies may block sound before first click
  }
}

const AUTO_DISMISS_MS = 7000;

export const LiveOrderAlertPopup: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [alerts, setAlerts] = useState<IncomingOrder[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: pendingOrders = [] } = useQuery<IncomingOrder[]>({
    queryKey: ['restaurant', restaurantId, 'live-order-watcher'],
    enabled: Boolean(restaurantId && restaurantTokenStorage.getAccessToken()),
    refetchInterval: 3500,
    queryFn: () => restaurantHttpClient.get<IncomingOrder[]>(`/restaurant/${restaurantId}/orders?status=pending`),
  });

  const clearTimer = (id: string) => {
    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(id);
    }
  };

  const dismiss = (id: string) => {
    clearTimer(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    initializedRef.current = false;
    seenIdsRef.current = new Set();
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
      pendingOrders.forEach((o) => seenIdsRef.current.add(o.id));
      initializedRef.current = true;
      return;
    }

    const brandNew = pendingOrders.filter((o) => !seenIdsRef.current.has(o.id));
    if (brandNew.length > 0) {
      brandNew.forEach((o) => {
        seenIdsRef.current.add(o.id);
        clearTimer(o.id);
        const timer = setTimeout(() => {
          dismiss(o.id);
        }, AUTO_DISMISS_MS);
        timersRef.current.set(o.id, timer);
      });
      playOrderChime();
      setAlerts((prev) => [...brandNew, ...prev].slice(0, 3));
    }
  }, [pendingOrders]);

  const handleQuickAccept = async (ord: IncomingOrder) => {
    if (!restaurantId) return;
    setAcceptingId(ord.id);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/orders/${ord.id}/status`, {
        status: 'confirmed',
      });
      dismiss(ord.id);
      await queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      showToast(`Order ${ord.orderNumber} accepted!`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to accept order', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 84,
        right: 22,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: 375,
        maxWidth: 'calc(100vw - 28px)',
      }}
    >
      {alerts.map((ord) => (
        <div
          key={ord.id}
          className="zr-order-popup"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            borderRadius: 18,
            padding: 18,
            border: '1.5px solid rgba(244, 123, 32, 0.75)',
            boxShadow: '0 20px 44px rgba(15, 23, 42, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="zr-order-pulse"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #F47B20, #EA580C)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BellRing size={19} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#FDBA74', letterSpacing: '0.08em' }}>
                  NEW LIVE CUSTOMER ORDER
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{ord.orderNumber}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(ord.id)}
              aria-label="Dismiss order alert"
              style={{
                width: 28,
                height: 28,
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
              <X size={15} />
            </button>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 800 }}>
              <span>{ord.customerName}</span>
              <span style={{ color: '#4ADE80' }}>{formatMoney(ord.totalMinor)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.4 }}>{ord.itemsSummary}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              {ord.paymentMethod} {ord.deliveryAddress ? `· ${ord.deliveryAddress}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={acceptingId === ord.id}
              onClick={() => void handleQuickAccept(ord)}
              className="zr-btn zr-btn-primary"
              style={{ flex: 1, minHeight: 38, fontSize: 13 }}
            >
              <CheckCircle2 size={15} />
              <span>{acceptingId === ord.id ? 'Accepting...' : 'Accept Order'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                dismiss(ord.id);
                navigate('/orders');
              }}
              className="zr-btn"
              style={{
                minHeight: 38,
                fontSize: 13,
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <ShoppingBag size={14} />
              <span>View</span>
            </button>
          </div>
          <div className="zr-popup-timer-track">
            <div className="zr-popup-timer-bar" />
          </div>
        </div>
      ))}
    </div>
  );
};
