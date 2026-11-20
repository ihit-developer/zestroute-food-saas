import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  className = '',
  ...props
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={`zr-btn zr-btn-primary ${className}`}
    style={{ width: fullWidth ? '100%' : undefined, ...style }}
    {...props}
  >
    {loading ? <Loader2 size={18} className="zr-spin" /> : leftIcon}
    <span>{children}</span>
    {!loading && rightIcon}
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  className = '',
  ...props
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={`zr-btn zr-btn-secondary ${className}`}
    style={{ width: fullWidth ? '100%' : undefined, ...style }}
    {...props}
  >
    {loading ? <Loader2 size={18} /> : leftIcon}
    <span>{children}</span>
    {!loading && rightIcon}
  </button>
);

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  className = '',
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`zr-icon-btn ${className}`}
    {...props}
  >
    {icon}
  </button>
);
