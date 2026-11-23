import { createAuthApi, createHttpClient, type TokenStorageAdapter } from '@zestroute/shared';

const ACCESS_KEY = 'zr_restaurant_access_token';
const REFRESH_KEY = 'zr_restaurant_refresh_token';

const defaultApiUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://zestroute-api.vercel.app/api/v1'
    : 'http://localhost:5000/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

// Clear any legacy persistent tokens so opening the live link in any new or old browser ALWAYS requires Login first
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore storage errors
  }
}

export const restaurantTokenStorage: TokenStorageAdapter = {
  getAccessToken: () => sessionStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => sessionStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clearTokens: () => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const restaurantHttpClient = createHttpClient(API_BASE_URL, restaurantTokenStorage);
export const restaurantAuthApi = createAuthApi(restaurantHttpClient);
