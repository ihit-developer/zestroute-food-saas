import React from 'react';

interface ZestRouteLogoProps {
  compact?: boolean;
  size?: number;
}

export const ZestRouteLogo: React.FC<ZestRouteLogoProps> = ({
  compact = false,
  size = 36,
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Dastarkhwan Logo"
      >
        <rect width="40" height="40" rx="12" fill="#F47B20" />
        {/* Stylized cloche + route pin */}
        <path
          d="M10 24.5C10 18.701 14.477 14 20 14C25.523 14 30 18.701 30 24.5H10Z"
          fill="#FFFFFF"
        />
        <rect x="8.5" y="26.5" width="23" height="3" rx="1.5" fill="#FFC857" />
        <circle cx="20" cy="11.5" r="2.2" fill="#FFC857" />
      </svg>
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--zr-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Dastar<span style={{ color: 'var(--zr-primary)' }}>khwan</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>
            FRESH &amp; FAST
          </span>
        </div>
      )}
    </div>
  );
};
