export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorShape;
  meta?: { page: number; limit: number; total: number };
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
  }
}

export interface TokenStorageAdapter {
  getAccessToken: () => Promise<string | null> | string | null;
  getRefreshToken: () => Promise<string | null> | string | null;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void> | void;
  clearTokens: () => Promise<void> | void;
}

export function createHttpClient(baseUrl: string, storage: TokenStorageAdapter) {
  let refreshInFlight: Promise<string | null> | null = null;

  async function attemptRefresh(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) return null;

      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          await storage.clearTokens();
          return null;
        }
        const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        if (!json.success || !json.data) {
          await storage.clearTokens();
          return null;
        }
        await storage.setTokens(json.data.accessToken, json.data.refreshToken);
        return json.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  async function request<T>(
    path: string,
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...rest } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string> | undefined),
    };

    if (!skipAuth) {
      const token = await storage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(`${baseUrl}${path}`, { ...rest, headers });

    if (response.status === 401 && !skipAuth) {
      const nextToken = await attemptRefresh();
      if (nextToken) {
        headers.Authorization = `Bearer ${nextToken}`;
        response = await fetch(`${baseUrl}${path}`, { ...rest, headers });
      }
    }

    const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok || !body.success) {
      throw new ApiClientError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? 'Request failed',
        body.error?.details
      );
    }

    return body.data as T;
  }

  return {
    get: <T>(path: string, skipAuth = false) => request<T>(path, { method: 'GET', skipAuth }),
    post: <T>(path: string, payload?: unknown, skipAuth = false) =>
      request<T>(path, {
        method: 'POST',
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
        skipAuth,
      }),
    patch: <T>(path: string, payload?: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}
