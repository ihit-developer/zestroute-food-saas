import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, riderTokenStorage } from '../services/apiClient';
import { useRiderStore } from '../store/useRiderStore';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

export function useRiderRealtime() {
  const isAuthenticated = useRiderStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let socket: Socket | null = null;
    let mounted = true;

    (async () => {
      const token = await riderTokenStorage.getAccessToken();
      if (!token || !mounted) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socket.on('delivery:offer', () => {
        queryClient.invalidateQueries({ queryKey: ['rider', 'requests'] });
      });
      socket.on('delivery:offer_taken', () => {
        queryClient.invalidateQueries({ queryKey: ['rider', 'requests'] });
      });
    })();

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  return { connected };
}
