import React from 'react';
import { Menu } from 'lucide-react';
import { ZestRouteLogo } from '../brand/ZestRouteLogo';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Sidebar: React.FC<{
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}> = ({ items, activeKey, onSelect, collapsed = false, onToggleCollapse }) => (
  <aside className={`zr-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div
      style={{
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        paddingBottom: 16,
        borderBottom: '1px solid var(--zr-border)',
        marginBottom: 8,
      }}
    >
      <ZestRouteLogo compact={collapsed} />
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="zr-icon-btn"
          style={{ width: 34, height: 34 }}
        >
          <Menu size={16} />
        </button>
      )}
    </div>

    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--zr-radius-md)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: active ? 'var(--zr-primary-soft)' : 'transparent',
              color: active ? 'var(--zr-secondary)' : 'var(--zr-text)',
              fontWeight: active ? 600 : 500,
              fontSize: 14,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </span>
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--zr-primary)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 9999,
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  </aside>
);

export const TopNav: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <header className="zr-topbar">
    <div>
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h1>
      {subtitle && (
        <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{subtitle}</span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>
  </header>
);

export const BottomNav: React.FC<{
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}> = ({ items, activeKey, onSelect }) => (
  <nav className="zr-mobile-bottom-nav" aria-label="Mobile Navigation">
    {items.slice(0, 5).map((item) => {
      const active = item.key === activeKey;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            padding: '6px 10px',
            cursor: 'pointer',
            color: active ? 'var(--zr-primary)' : 'var(--zr-text-secondary)',
            fontSize: 11,
            fontWeight: active ? 700 : 500,
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      );
    })}
  </nav>
);
