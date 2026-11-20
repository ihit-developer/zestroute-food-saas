import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  COMMON_STRINGS,
  DARK_THEME,
  FONT_FAMILIES,
  LIGHT_THEME,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY_SCALE,
  isRTL,
  type AppThemeColors,
  type SupportedLocale,
  type ThemeMode,
} from '@zestroute/shared';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  rtl: boolean;
  colors: AppThemeColors;
  spacing: typeof SPACING;
  radii: typeof RADII;
  shadows: typeof SHADOWS;
  typography: typeof TYPOGRAPHY_SCALE;
  fonts: (typeof FONT_FAMILIES)['english'] | (typeof FONT_FAMILIES)['urdu'];
  strings: (typeof COMMON_STRINGS)['en'];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const value = useMemo<ThemeContextValue>(() => {
    const rtl = isRTL(locale);
    return {
      mode,
      setMode,
      toggleMode: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      locale,
      setLocale,
      rtl,
      colors: mode === 'dark' ? DARK_THEME : LIGHT_THEME,
      spacing: SPACING,
      radii: RADII,
      shadows: SHADOWS,
      typography: TYPOGRAPHY_SCALE,
      fonts: rtl ? FONT_FAMILIES.urdu : FONT_FAMILIES.english,
      strings: COMMON_STRINGS[locale],
    };
  }, [mode, locale]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
