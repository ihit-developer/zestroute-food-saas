import { create } from 'zustand';
import type { ApprovalStatus } from '@zestroute/shared';

interface RiderStoreState {
  isAuthenticated: boolean;
  approvalStatus: ApprovalStatus;
  isOnline: boolean;
  activeDeliveryId: string | null;
  riderProfile: {
    id: string;
    fullName: string;
    phone: string;
    vehicleType: 'bike' | 'scooter' | 'car';
    vehicleNumber: string;
    ratingAvg: number;
  } | null;

  setSession: (profile: RiderStoreState['riderProfile'], approvalStatus?: ApprovalStatus) => void;
  setOnline: (online: boolean) => void;
  setActiveDeliveryId: (id: string | null) => void;
  logout: () => void;
}

export const useRiderStore = create<RiderStoreState>((set) => ({
  isAuthenticated: false,
  approvalStatus: 'pending',
  isOnline: false,
  activeDeliveryId: null,
  riderProfile: null,

  setSession: (profile, approvalStatus = 'pending') =>
    set({
      riderProfile: profile,
      isAuthenticated: Boolean(profile),
      approvalStatus,
    }),
  setOnline: (isOnline) => set({ isOnline }),
  setActiveDeliveryId: (activeDeliveryId) => set({ activeDeliveryId }),
  logout: () =>
    set({
      isAuthenticated: false,
      isOnline: false,
      activeDeliveryId: null,
      riderProfile: null,
    }),
}));
