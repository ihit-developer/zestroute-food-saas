import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAuthApi, createHttpClient, type TokenStorageAdapter } from '@zestroute/shared';

const ACCESS_KEY = 'zr_rider_access_token';
const REFRESH_KEY = 'zr_rider_refresh_token';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export const riderTokenStorage: TokenStorageAdapter = {
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

export const riderHttpClient = createHttpClient(API_BASE_URL, riderTokenStorage);
export const riderAuthApi = createAuthApi(riderHttpClient);
