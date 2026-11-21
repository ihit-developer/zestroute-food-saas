import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAuthApi, createHttpClient, type TokenStorageAdapter } from '@zestroute/shared';

const ACCESS_KEY = 'zr_customer_access_token';
const REFRESH_KEY = 'zr_customer_refresh_token';

const webHostname = (globalThis as { location?: { hostname?: string } }).location?.hostname;
const isRemoteWeb =
  Boolean(webHostname) && webHostname !== 'localhost' && webHostname !== '127.0.0.1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (isRemoteWeb ? 'https://zestroute-api.vercel.app/api/v1' : 'http://localhost:5000/api/v1');

export const tokenStorage: TokenStorageAdapter = {
  getAccessToken: () => AsyncStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => AsyncStorage.getItem(REFRESH_KEY),
  setTokens: async (access, refresh) => {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, access],
      [REFRESH_KEY, refresh],
    ]);
  },
  clearTokens: async () => {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },
};

export const httpClient = createHttpClient(API_BASE_URL, tokenStorage);
export const authApi = createAuthApi(httpClient);
