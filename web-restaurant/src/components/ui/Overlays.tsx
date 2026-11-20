import React from 'react';
import { X } from 'lucide-react';
import type { TabItem } from '@zestroute/shared';
import { PrimaryButton, SecondaryButton } from './Button';

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--zr-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        className="zr-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--zr-shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--zr-border)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zr-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--zr-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmationDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    footer={
      <>
        <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
        <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
      </>
    }
  >
    <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>{message}</p>
  </Modal>
);

export const BottomSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--zr-overlay)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        className="zr-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 640,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          padding: 20,
          boxShadow: 'var(--zr-shadow-lg)',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--zr-border)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zr-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Tabs: React.FC<{
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}> = ({ items, activeKey, onChange }) => (
  <div
    role="tablist"
    style={{
      display: 'inline-flex',
      gap: 6,
      padding: 4,
      backgroundColor: 'var(--zr-surface-elevated)',
      border: '1px solid var(--zr-border)',
      borderRadius: 'var(--zr-radius-md)',
      flexWrap: 'wrap',
    }}
  >
    {items.map((tab) => {
      const active = tab.key === activeKey;
      return (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active}
          type="button"
          onClick={() => onChange(tab.key)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--zr-radius-sm)',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: active ? 'var(--zr-primary)' : 'transparent',
            color: active ? '#fff' : 'var(--zr-text-secondary)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>{tab.label}</span>
          {tab.badgeCount !== undefined && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 9999,
                backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--zr-border)',
                color: active ? '#fff' : 'var(--zr-text)',
              }}
            >
              {tab.badgeCount}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
