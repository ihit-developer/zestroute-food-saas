import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, Inbox, Menu, RefreshCw, Search, Upload, X } from 'lucide-react';
import type { SelectOption, SemanticTone, TabItem } from '@zestroute/shared';

export const ZestRouteLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <svg width={34} height={34} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="12" fill="#F47B20" />
      <path d="M10 24.5C10 18.701 14.477 14 20 14C25.523 14 30 18.701 30 24.5H10Z" fill="#FFFFFF" />
      <rect x="8.5" y="26.5" width="23" height="3" rx="1.5" fill="#FFC857" />
      <circle cx="20" cy="11.5" r="2.2" fill="#FFC857" />
    </svg>
    {!compact && (
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>
          Dastar<span style={{ color: 'var(--zr-primary)' }}>khwan</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--zr-text-secondary)' }}>SUPER ADMIN</div>
      </div>
    )}
  </div>
);

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; leftIcon?: React.ReactNode }
> = ({ children, fullWidth, leftIcon, style, ...props }) => (
  <button type="button" className="zr-btn zr-btn-primary" style={{ width: fullWidth ? '100%' : undefined, ...style }} {...props}>
    {leftIcon}
    <span>{children}</span>
  </button>
);

export const SecondaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; leftIcon?: React.ReactNode }
> = ({ children, fullWidth, leftIcon, style, ...props }) => (
  <button type="button" className="zr-btn zr-btn-secondary" style={{ width: fullWidth ? '100%' : undefined, ...style }} {...props}>
    {leftIcon}
    <span>{children}</span>
  </button>
);

export const IconButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button type="button" aria-label={label} title={label} className="zr-icon-btn" onClick={onClick}>
    {icon}
  </button>
);

export const InputField: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; rightElement?: React.ReactNode }
> = ({ label, error, rightElement, ...props }) => (
  <div className="zr-field-wrap">
    {label && <label className="zr-label">{label}</label>}
    <div className="zr-input-box" style={{ borderColor: error ? 'var(--zr-error)' : undefined }}>
      <input className="zr-input" {...props} />
      {rightElement}
    </div>
    {error && <span style={{ fontSize: 12, color: 'var(--zr-error)' }}>{error}</span>}
  </div>
);

export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({
  value,
  onChange,
  placeholder = 'Search...',
}) => (
  <div className="zr-input-box" style={{ borderRadius: 9999 }}>
    <Search size={16} color="var(--zr-text-secondary)" />
    <input
      type="search"
      className="zr-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export const Dropdown: React.FC<{
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="zr-field-wrap">
    {label && <label className="zr-label">{label}</label>}
    <div className="zr-input-box">
      <select className="zr-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export const ImageUploader: React.FC<{ label?: string; onFileSelected: (f: File) => void }> = ({
  label,
  onFileSelected,
}) => (
  <div className="zr-field-wrap">
    {label && <span className="zr-label">{label}</span>}
    <label
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14,
        border: '1.5px dashed var(--zr-border)', borderRadius: 12, cursor: 'pointer',
      }}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
      />
      <Upload size={18} color="var(--zr-primary)" />
      <span style={{ fontSize: 13, fontWeight: 600 }}>Upload Image</span>
    </label>
  </div>
);

const TONE_MAP: Record<SemanticTone, { bg: string; color: string }> = {
  success: { bg: 'var(--zr-success-bg)', color: 'var(--zr-success)' },
  warning: { bg: 'var(--zr-warning-bg)', color: 'var(--zr-warning)' },
  error: { bg: 'var(--zr-error-bg)', color: 'var(--zr-error)' },
  info: { bg: 'var(--zr-info-bg)', color: 'var(--zr-info)' },
  primary: { bg: 'var(--zr-primary-soft)', color: 'var(--zr-secondary)' },
  neutral: { bg: 'var(--zr-surface-elevated)', color: 'var(--zr-text-secondary)' },
};

export const StatusBadge: React.FC<{ label: string; tone?: SemanticTone }> = ({ label, tone = 'neutral' }) => {
  const p = TONE_MAP[tone];
  return (
    <span className="zr-badge" style={{ backgroundColor: p.bg, color: p.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: p.color }} />
      {label}
    </span>
  );
};

export const Tabs: React.FC<{ items: TabItem[]; activeKey: string; onChange: (k: string) => void }> = ({
  items,
  activeKey,
  onChange,
}) => (
  <div style={{ display: 'inline-flex', gap: 6, padding: 4, background: 'var(--zr-surface-elevated)', border: '1px solid var(--zr-border)', borderRadius: 12, flexWrap: 'wrap' }}>
    {items.map((t) => {
      const active = t.key === activeKey;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            backgroundColor: active ? 'var(--zr-primary)' : 'transparent',
            color: active ? '#fff' : 'var(--zr-text-secondary)', fontSize: 13, fontWeight: 600,
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyState,
}: {
  columns: Array<{ key: string; header: string; render: (row: T) => React.ReactNode }>;
  data: T[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
}) {
  if (data.length === 0 && emptyState) return <>{emptyState}</>;
  return (
    <div className="zr-table-wrap">
      <table className="zr-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={rowKey(r)}>{columns.map((c) => <td key={c.key}>{c.render(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const EmptyState: React.FC<{ title: string; description?: string; actionLabel?: string; onAction?: () => void }> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="zr-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
    <Inbox size={26} color="var(--zr-primary)" />
    <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
    {description && <p style={{ margin: 0, fontSize: 14, color: 'var(--zr-text-secondary)', maxWidth: 420 }}>{description}</p>}
    {actionLabel && onAction && <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="zr-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderColor: 'var(--zr-error)' }}>
    <AlertTriangle size={24} color="var(--zr-error)" />
    <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>{message}</p>
    {onRetry && <SecondaryButton onClick={onRetry} leftIcon={<RefreshCw size={15} />}>Retry</SecondaryButton>}
  </div>
);

export const LoadingSkeleton: React.FC<{ height?: number }> = ({ height = 100 }) => (
  <div style={{ height, borderRadius: 12, background: 'var(--zr-skeleton-base)' }} />
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--zr-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div className="zr-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--zr-border)' }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--zr-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
};

export interface AdminNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export const AdminSidebar: React.FC<{
  items: AdminNavItem[];
  activeKey: string;
  onSelect: (k: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}> = ({ items, activeKey, onSelect, collapsed, onToggle }) => (
  <aside className={`zr-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div
      style={{
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        paddingBottom: 14,
        borderBottom: '1px solid var(--zr-border)',
        marginBottom: 8,
      }}
    >
      <ZestRouteLogo compact={collapsed} />
      <IconButton icon={<Menu size={16} />} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} />
    </div>
    {items.map((item) => {
      const active = item.key === activeKey;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
            padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            backgroundColor: active ? 'var(--zr-primary-soft)' : 'transparent',
            color: active ? 'var(--zr-secondary)' : 'var(--zr-text)', fontWeight: active ? 600 : 500, fontSize: 13.5,
          }}
        >
          {item.icon}
          {!collapsed && <span>{item.label}</span>}
        </button>
      );
    })}
  </aside>
);

const ToastContext = createContext<{ showToast: (msg: string) => void } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const showToast = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {msg && (
        <div className="zr-card" style={{ position: 'fixed', bottom: 20, insetInlineEnd: 20, padding: '12px 16px', zIndex: 60, boxShadow: 'var(--zr-shadow-md)', fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
