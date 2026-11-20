import type { createHttpClient } from './httpClient';

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  roles: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export function createAuthApi(http: ReturnType<typeof createHttpClient>) {
  return {
    register: (payload: {
      fullName: string;
      email?: string;
      phone?: string;
      password: string;
      role: 'customer' | 'restaurant_owner' | 'rider';
    }) => http.post<AuthResponse>('/auth/register', payload, true),

    login: (payload: { identifier: string; password: string }) =>
      http.post<AuthResponse>('/auth/login', payload, true),

    logout: (refreshToken: string) =>
      http.post<{ loggedOut: boolean }>('/auth/logout', { refreshToken }),

    forgotPassword: (identifier: string) =>
      http.post<{ sent: boolean }>('/auth/forgot-password', { identifier }, true),

    resetPassword: (payload: { identifier: string; otp: string; newPassword: string }) =>
      http.post<{ passwordUpdated: boolean }>('/auth/reset-password', payload, true),

    me: () =>
      http.get<{
        profile: { _id: string; fullName: string; email?: string; phone?: string };
        roles: string[];
      }>('/auth/me'),
  };
}
