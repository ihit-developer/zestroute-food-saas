import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, tokenStorage } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

export function useRealtimeOrderTracking(orderId?: string) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let socket: Socket | null = null;
    let mounted = true;

    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token || !mounted) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        setConnected(true);
        if (orderId) socket?.emit('subscribe:order', orderId);
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('order:status_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['customer', 'orders'] });
      });

      socket.on('notification:new', () => {
        queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
      });

      socket.on('rider:location_update', (loc: { lat: number; lng: number; heading?: number }) => {
        setRiderLocation(loc);
      });
    })();

    return () => {
      mounted = false;
      if (orderId && socket) socket.emit('unsubscribe:order', orderId);
      socket?.disconnect();
    };
  }, [isAuthenticated, orderId, queryClient]);

  return { connected, riderLocation };
}
