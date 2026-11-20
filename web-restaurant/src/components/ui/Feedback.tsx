import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Inbox, RefreshCw, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './Button';

export const LoadingSkeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}> = ({ width = '100%', height = 18, circle = false }) => (
  <div
    className="zr-skeleton"
    style={{
      width,
      height,
      borderRadius: circle ? '9999px' : 'var(--zr-radius-sm)',
    }}
  />
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionLabel, onAction, icon }) => (
  <div
    className="zr-card"
    style={{
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 10,
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 9999,
        backgroundColor: 'var(--zr-primary-soft)',
        color: 'var(--zr-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ?? <Inbox size={24} />}
    </div>
    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
    {description && (
      <p style={{ margin: 0, fontSize: 14, color: 'var(--zr-text-secondary)', maxWidth: 380 }}>
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <div style={{ marginTop: 6 }}>
        <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
      </div>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <div
    className="zr-card"
    style={{
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 10,
      borderColor: 'var(--zr-error)',
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 9999,
        backgroundColor: 'var(--zr-error-bg)',
        color: 'var(--zr-error)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AlertTriangle size={22} />
    </div>
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 14, color: 'var(--zr-text-secondary)', maxWidth: 400 }}>{message}</p>
    {onRetry && (
      <SecondaryButton onClick={onRetry} leftIcon={<RefreshCw size={15} />}>
        Try Again
      </SecondaryButton>
    )}
  </div>
);

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{
  showToast: (message: string, tone?: ToastTone) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const iconFor = (tone: ToastTone) => {
    if (tone === 'success') return <CheckCircle2 size={18} color="var(--zr-success)" />;
    if (tone === 'error' || tone === 'warning') return <AlertTriangle size={18} color={`var(--zr-${tone})`} />;
    return <Info size={18} color="var(--zr-info)" />;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          insetInlineEnd: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 60,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="zr-card"
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--zr-shadow-md)',
            }}
          >
            {iconFor(t.tone)}
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Dismiss toast"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zr-text-secondary)' }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
