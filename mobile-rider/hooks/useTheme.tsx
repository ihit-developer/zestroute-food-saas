import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  COMMON_STRINGS,
  DARK_THEME,
  LIGHT_THEME,
  RADII,
  SHADOWS,
  SPACING,
  isRTL,
  type AppThemeColors,
  type SupportedLocale,
  type ThemeMode,
} from '@zestroute/shared';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  locale: SupportedLocale;
  setLocale: (l: SupportedLocale) => void;
  rtl: boolean;
  colors: AppThemeColors;
  spacing: typeof SPACING;
  radii: typeof RADII;
  shadows: typeof SHADOWS;
  strings: (typeof COMMON_STRINGS)['en'];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      toggleMode: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      locale,
      setLocale,
      rtl: isRTL(locale),
      colors: mode === 'dark' ? DARK_THEME : LIGHT_THEME,
      spacing: SPACING,
      radii: RADII,
      shadows: SHADOWS,
      strings: COMMON_STRINGS[locale],
    }),
    [mode, locale]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
