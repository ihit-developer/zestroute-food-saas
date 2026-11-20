import { create } from 'zustand';
import type { ApprovalStatus, SupportedLocale, ThemeMode } from '@zestroute/shared';

const REST_ID_KEY = 'zr_active_restaurant_id';
const REST_NAME_KEY = 'zr_active_restaurant_name';

interface RestaurantStoreState {
  theme: ThemeMode;
  locale: SupportedLocale;
  toggleTheme: () => void;
  toggleLocale: () => void;

  approvalStatus: ApprovalStatus;
  restaurantId: string | null;
  restaurantName: string;
  setRestaurantContext: (name: string, status: ApprovalStatus, id?: string | null) => void;
}

export const useRestaurantStore = create<RestaurantStoreState>((set) => ({
  theme: 'light',
  locale: 'en',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  toggleLocale: () => set((s) => ({ locale: s.locale === 'en' ? 'ur' : 'en' })),

  approvalStatus: 'approved',
  restaurantId: typeof localStorage !== 'undefined' ? localStorage.getItem(REST_ID_KEY) : null,
  restaurantName:
    (typeof localStorage !== 'undefined' ? localStorage.getItem(REST_NAME_KEY) : null) ??
    'Restaurant Portal',
  setRestaurantContext: (restaurantName, approvalStatus, restaurantId = null) => {
    if (typeof localStorage !== 'undefined') {
      if (restaurantId) {
        localStorage.setItem(REST_ID_KEY, restaurantId);
        localStorage.setItem(REST_NAME_KEY, restaurantName);
      } else {
        localStorage.removeItem(REST_ID_KEY);
        localStorage.removeItem(REST_NAME_KEY);
      }
    }
    set({ restaurantName, approvalStatus, restaurantId });
  },
}));
