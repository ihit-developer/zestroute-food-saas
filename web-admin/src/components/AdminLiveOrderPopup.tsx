import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing, ShoppingBag, X } from 'lucide-react';
import { formatMoney } from '@zestroute/shared';
import { adminHttpClient, adminTokenStorage } from '../services/apiClient';

interface AdminOrderAlert {
  id: string;
  orderNumber: string;
  restaurant: string;
  customer?: string;
  paymentMethod?: string;
  totalMinor: number;
  status: string;
}

function playAdminChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.32);
    });
  } catch {
    // Ignore autoplay restrictions
  }
}

export const AdminLiveOrderPopup: React.FC = () => {
  const navigate = useNavigate();
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<AdminOrderAlert[]>([]);

  const { data: orders = [] } = useQuery<AdminOrderAlert[]>({
    queryKey: ['admin', 'live-order-watcher'],
    enabled: Boolean(adminTokenStorage.getAccessToken()),
    refetchInterval: 4000,
    queryFn: () => adminHttpClient.get<AdminOrderAlert[]>('/admin/orders'),
  });

  useEffect(() => {
    if (!initializedRef.current) {
      orders.forEach((o) => seenIdsRef.current.add(o.id));
      initializedRef.current = true;
      return;
    }
    const fresh = orders.filter((o) => !seenIdsRef.current.has(o.id));
    if (fresh.length > 0) {
      fresh.forEach((o) => seenIdsRef.current.add(o.id));
      playAdminChime();
      setAlerts((prev) => [...fresh, ...prev].slice(0, 3));
    }
  }, [orders]);

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 22,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: 360,
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
            padding: 16,
            border: '1.5px solid rgba(244, 123, 32, 0.75)',
            boxShadow: '0 20px 44px rgba(15, 23, 42, 0.42)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="zr-order-pulse"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: 'linear-gradient(135deg, #F47B20, #EA580C)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BellRing size={18} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#FDBA74', letterSpacing: '0.08em' }}>
                  NEW PLATFORM ORDER
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 900 }}>
                  {ord.orderNumber} · {ord.restaurant}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(ord.id)}
              aria-label="Dismiss"
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
              borderRadius: 10,
              padding: '9px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <span style={{ color: '#E2E8F0', fontWeight: 700 }}>{ord.customer || 'Customer'}</span>
            <strong style={{ color: '#4ADE80' }}>{formatMoney(ord.totalMinor)}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              dismiss(ord.id);
              navigate('/orders');
            }}
            className="zr-btn zr-btn-primary"
            style={{ width: '100%', minHeight: 36, fontSize: 13 }}
          >
            <ShoppingBag size={14} />
            <span>Open Global Orders</span>
          </button>
        </div>
      ))}
    </div>
  );
};
