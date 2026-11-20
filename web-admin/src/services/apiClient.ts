import { createAuthApi, createHttpClient, type TokenStorageAdapter } from '@zestroute/shared';

const ACCESS_KEY = 'zr_admin_access_token';
const REFRESH_KEY = 'zr_admin_refresh_token';

const defaultApiUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://zestroute-api.vercel.app/api/v1'
    : 'http://localhost:5000/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const adminTokenStorage: TokenStorageAdapter = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const adminHttpClient = createHttpClient(API_BASE_URL, adminTokenStorage);
export const adminAuthApi = createAuthApi(adminHttpClient);
