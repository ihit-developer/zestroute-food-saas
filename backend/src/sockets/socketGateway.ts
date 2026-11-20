import type { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/crypto.js';
import {
  DeliveryModel,
  OrderModel,
  ProfileModel,
  RestaurantModel,
  RestaurantStaffModel,
  RiderModel,
} from '../models/index.js';

let ioInstance: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    roles: string[];
  };
}

export function initializeSocketGateway(io: SocketIOServer): void {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth?.token === 'string'
          ? socket.handshake.auth.token
          : '';
      if (!token) {
        return next(new Error('UNAUTHORIZED'));
      }

      const payload = verifyAccessToken(token);
      const profile = await ProfileModel.findById(payload.sub).select('accountStatus').lean();
      if (!profile || profile.accountStatus !== 'active') {
        return next(new Error('ACCOUNT_INACTIVE'));
      }

      socket.data.userId = payload.sub;
      socket.data.roles = payload.roles;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId, roles } = socket.data;

    // Personal notification & order updates room
    socket.join(`user:${userId}`);

    socket.on('subscribe:order', async (orderId: string, ack?: (ok: boolean) => void) => {
      try {
        const order = await OrderModel.findById(orderId).lean();
        if (!order) return ack?.(false);

        const isCustomer = String(order.customerId) === userId;
        const isAdmin = roles.includes('super_admin');
        const isRestOwner = Boolean(
          await RestaurantModel.exists({ _id: order.restaurantId, ownerId: userId })
        );
        const isRestStaff = Boolean(
          await RestaurantStaffModel.exists({
            restaurantId: order.restaurantId,
            userId,
            isActive: true,
          })
        );
        const rider = await RiderModel.findOne({ userId }).select('_id').lean();
        const isAssignedRider = rider
          ? Boolean(await DeliveryModel.exists({ orderId: order._id, riderId: rider._id }))
          : false;

        if (!isCustomer && !isAdmin && !isRestOwner && !isRestStaff && !isAssignedRider) {
          return ack?.(false);
        }

        socket.join(`order:${orderId}`);
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on('subscribe:restaurant', async (restaurantId: string, ack?: (ok: boolean) => void) => {
      try {
        const isAdmin = roles.includes('super_admin');
        const isOwner = Boolean(
          await RestaurantModel.exists({ _id: restaurantId, ownerId: userId })
        );
        const isStaff = Boolean(
          await RestaurantStaffModel.exists({ restaurantId, userId, isActive: true })
        );
        if (!isAdmin && !isOwner && !isStaff) return ack?.(false);
        socket.join(`restaurant:${restaurantId}`);
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on('unsubscribe:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });
  });
}

export function emitOrderNew(restaurantId: string, payload: Record<string, unknown>): void {
  ioInstance?.to(`restaurant:${restaurantId}`).emit('order:new', payload);
}

export function emitOrderStatusChanged(
  orderId: string,
  customerId: string,
  payload: Record<string, unknown>
): void {
  ioInstance?.to(`order:${orderId}`).to(`user:${customerId}`).emit('order:status_changed', payload);
}

export function emitRiderLocation(orderId: string, payload: Record<string, unknown>): void {
  ioInstance?.to(`order:${orderId}`).emit('rider:location_update', payload);
}

export function emitUserNotification(userId: string, payload: Record<string, unknown>): void {
  ioInstance?.to(`user:${userId}`).emit('notification:new', payload);
}
