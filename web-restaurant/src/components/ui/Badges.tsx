import React from 'react';
import type { SemanticTone } from '@zestroute/shared';

const TONE_STYLES: Record<SemanticTone, { bg: string; color: string }> = {
  success: { bg: 'var(--zr-success-bg)', color: 'var(--zr-success)' },
  warning: { bg: 'var(--zr-warning-bg)', color: 'var(--zr-warning)' },
  error: { bg: 'var(--zr-error-bg)', color: 'var(--zr-error)' },
  info: { bg: 'var(--zr-info-bg)', color: 'var(--zr-info)' },
  primary: { bg: 'var(--zr-primary-soft)', color: 'var(--zr-secondary)' },
  neutral: { bg: 'var(--zr-surface-elevated)', color: 'var(--zr-text-secondary)' },
};

interface StatusBadgeProps {
  label: string;
  tone?: SemanticTone;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'neutral' }) => {
  const palette = TONE_STYLES[tone];
  return (
    <span className="zr-badge" style={{ backgroundColor: palette.bg, color: palette.color }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          backgroundColor: palette.color,
        }}
      />
      {label}
    </span>
  );
};

interface DiscountBadgeProps {
  text: string;
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({ text }) => (
  <span
    className="zr-badge"
    style={{
      backgroundColor: 'var(--zr-accent)',
      color: '#292522',
      fontWeight: 700,
    }}
  >
    {text}
  </span>
);
