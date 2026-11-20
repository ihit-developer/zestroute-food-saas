import React, { useEffect, useState } from 'react';
import { Calendar, ChevronDown, Search, Upload, X } from 'lucide-react';
import type { SelectOption } from '@zestroute/shared';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="zr-field-wrap">
      {label && (
        <label htmlFor={inputId} className="zr-label">
          {label}
        </label>
      )}
      <div className={`zr-input-box ${error ? 'zr-error' : ''}`}>
        {leftIcon}
        <input id={inputId} className="zr-input" {...props} />
        {rightElement}
      </div>
      {error ? (
        <span style={{ fontSize: 12, color: 'var(--zr-error)' }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 250,
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, debounceMs, onChange, value]);

  return (
    <div className="zr-input-box" style={{ borderRadius: 'var(--zr-radius-full)' }}>
      <Search size={18} color="var(--zr-text-secondary)" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="zr-input"
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          aria-label="Clear search"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--zr-text-secondary)',
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

interface DropdownProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onChange,
  error,
}) => (
  <div className="zr-field-wrap">
    {label && <label className="zr-label">{label}</label>}
    <div className={`zr-input-box ${error ? 'zr-error' : ''}`} style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="zr-input"
        style={{ appearance: 'none', cursor: 'pointer', paddingInlineEnd: 24 }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} color="var(--zr-text-secondary)" style={{ pointerEvents: 'none' }} />
    </div>
    {error && <span style={{ fontSize: 12, color: 'var(--zr-error)' }}>{error}</span>}
  </div>
);

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, min, max }) => (
  <InputField
    type="date"
    label={label}
    value={value}
    min={min}
    max={max}
    onChange={(e) => onChange(e.target.value)}
    leftIcon={<Calendar size={16} color="var(--zr-text-secondary)" />}
  />
);

interface ImageUploaderProps {
  label?: string;
  previewUrl?: string;
  onFileSelected: (file: File) => void;
  helperText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  previewUrl,
  onFileSelected,
  helperText = 'PNG, JPG or WEBP up to 5MB',
}) => (
  <div className="zr-field-wrap">
    {label && <span className="zr-label">{label}</span>}
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 20,
        border: '1.5px dashed var(--zr-border)',
        borderRadius: 'var(--zr-radius-lg)',
        background: 'var(--zr-surface-elevated)',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--zr-radius-md)' }}
        />
      ) : (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--zr-radius-full)',
            background: 'var(--zr-primary-soft)',
            color: 'var(--zr-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload size={20} />
        </div>
      )}
      <span style={{ fontSize: 13, fontWeight: 600 }}>Click to upload image</span>
      <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{helperText}</span>
    </label>
  </div>
);
