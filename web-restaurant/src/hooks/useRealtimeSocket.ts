import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, restaurantTokenStorage } from '../services/apiClient';
import { useRestaurantStore } from '../store/useRestaurantStore';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

export function useRestaurantRealtime() {
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = restaurantTokenStorage.getAccessToken();
    if (!token || !restaurantId || typeof token !== 'string') return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe:restaurant', restaurantId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'dashboard'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, restaurantId]);

  return { connected };
}
