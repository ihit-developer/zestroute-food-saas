import { create } from 'zustand';
import type { SupportedLocale, ThemeMode } from '@zestroute/shared';

interface AdminStoreState {
  theme: ThemeMode;
  locale: SupportedLocale;
  toggleTheme: () => void;
  toggleLocale: () => void;
}

export const useAdminStore = create<AdminStoreState>((set) => ({
  theme: 'light',
  locale: 'en',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  toggleLocale: () => set((s) => ({ locale: s.locale === 'en' ? 'ur' : 'en' })),
}));
