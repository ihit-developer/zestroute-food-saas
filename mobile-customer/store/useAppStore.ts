import { create } from 'zustand';

export interface CartCustomizationItem {
  addonId: string;
  name: string;
  priceMinor: number;
  quantity: number;
}

export interface CartLineItem {
  id: string;
  foodId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  unitPriceMinor: number;
  quantity: number;
  customizations: CartCustomizationItem[];
  specialInstructions?: string;
}

export interface SavedAddressDraft {
  id: string;
  label: 'home' | 'office' | 'other';
  fullName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  houseNumber: string;
  building?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface ActiveRestaurantSession {
  id: string;
  name: string;
  cuisineLabel?: string;
  locationLabel?: string;
}

interface AppStoreState {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (done: boolean) => void;

  isAuthenticated: boolean;
  user: { id: string; fullName: string; email: string; phone: string } | null;
  setSession: (user: { id: string; fullName: string; email: string; phone: string } | null) => void;

  selectedAddress: SavedAddressDraft | null;
  setSelectedAddress: (addr: SavedAddressDraft | null) => void;

  /** Currently locked restaurant for single-restaurant ordering mode */
  activeRestaurant: ActiveRestaurantSession | null;
  setActiveRestaurant: (rest: ActiveRestaurantSession | null) => void;
  switchActiveRestaurant: (
    rest: ActiveRestaurantSession,
    forceClearCart?: boolean
  ) => 'switched' | 'needs_confirm';

  cartRestaurantId: string | null;
  cartRestaurantName: string | null;
  cartItems: CartLineItem[];
  cartsByRestaurant: Record<string, { restaurantName: string; items: CartLineItem[] }>;
  appliedCouponCode: string | null;
  appliedDiscountMinor: number;
  pendingRestaurantSwitch: {
    restaurantId: string;
    restaurantName: string;
    item: CartLineItem;
  } | null;

  addToCart: (restaurantId: string, restaurantName: string, item: CartLineItem) => 'added' | 'needs_confirm';
  selectRestaurantCart: (restaurantId: string) => void;
  confirmReplaceCart: () => void;
  cancelReplaceCart: () => void;
  updateItemQty: (lineId: string, delta: number) => void;
  removeItem: (lineId: string) => void;
  applyCoupon: (code: string | null, discountMinor?: number) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (done) => set({ hasCompletedOnboarding: done }),

  isAuthenticated: false,
  user: null,
  setSession: (user) => set({ user, isAuthenticated: Boolean(user) }),

  selectedAddress: null,
  setSelectedAddress: (addr) => set({ selectedAddress: addr }),

  activeRestaurant: null,
  setActiveRestaurant: (rest) => set({ activeRestaurant: rest }),
  switchActiveRestaurant: (rest, forceClearCart = false) => {
    const state = get();
    const hasDifferentCart =
      state.cartItems.length > 0 &&
      Boolean(state.cartRestaurantId) &&
      state.cartRestaurantId !== rest.id;

    if (hasDifferentCart && !forceClearCart) {
      return 'needs_confirm';
    }

    if (hasDifferentCart && forceClearCart) {
      set({
        activeRestaurant: rest,
        cartRestaurantId: null,
        cartRestaurantName: null,
        cartItems: [],
        cartsByRestaurant: {},
        appliedCouponCode: null,
        appliedDiscountMinor: 0,
        pendingRestaurantSwitch: null,
      });
      return 'switched';
    }

    set({ activeRestaurant: rest });
    return 'switched';
  },

  cartRestaurantId: null,
  cartRestaurantName: null,
  cartItems: [],
  cartsByRestaurant: {},
  appliedCouponCode: null,
  appliedDiscountMinor: 0,
  pendingRestaurantSwitch: null,

  selectRestaurantCart: (restaurantId) => {
    const bucket = get().cartsByRestaurant[restaurantId];
    if (bucket) {
      set({
        cartRestaurantId: restaurantId,
        cartRestaurantName: bucket.restaurantName,
        cartItems: bucket.items,
      });
    }
  },

  addToCart: (restaurantId, restaurantName, item) => {
    const state = get();
    // Strict Single-Restaurant Ordering Rule: cannot mix items from 2 restaurants in one order
    if (
      state.cartItems.length > 0 &&
      state.cartRestaurantId &&
      state.cartRestaurantId !== restaurantId
    ) {
      set({
        pendingRestaurantSwitch: { restaurantId, restaurantName, item },
      });
      return 'needs_confirm';
    }

    const existingIdx = state.cartItems.findIndex((i) => i.id === item.id);
    const nextItems =
      existingIdx >= 0
        ? state.cartItems.map((i, idx) =>
            idx === existingIdx ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...state.cartItems, item];

    set({
      activeRestaurant:
        state.activeRestaurant?.id === restaurantId
          ? state.activeRestaurant
          : { id: restaurantId, name: restaurantName },
      cartRestaurantId: restaurantId,
      cartRestaurantName: restaurantName,
      cartItems: nextItems,
      cartsByRestaurant: {
        [restaurantId]: { restaurantName, items: nextItems },
      },
      pendingRestaurantSwitch: null,
    });
    return 'added';
  },

  confirmReplaceCart: () => {
    const pending = get().pendingRestaurantSwitch;
    if (!pending) return;
    set({
      activeRestaurant: {
        id: pending.restaurantId,
        name: pending.restaurantName,
      },
      cartRestaurantId: pending.restaurantId,
      cartRestaurantName: pending.restaurantName,
      cartItems: [pending.item],
      cartsByRestaurant: {
        [pending.restaurantId]: {
          restaurantName: pending.restaurantName,
          items: [pending.item],
        },
      },
      appliedCouponCode: null,
      appliedDiscountMinor: 0,
      pendingRestaurantSwitch: null,
    });
  },

  cancelReplaceCart: () => set({ pendingRestaurantSwitch: null }),

  updateItemQty: (lineId, delta) => {
    const state = get();
    const next = state.cartItems
      .map((i) => (i.id === lineId ? { ...i, quantity: i.quantity + delta } : i))
      .filter((i) => i.quantity > 0);
    const nextBuckets = { ...state.cartsByRestaurant };
    if (state.cartRestaurantId) {
      if (next.length === 0) {
        delete nextBuckets[state.cartRestaurantId];
      } else {
        nextBuckets[state.cartRestaurantId] = {
          restaurantName: state.cartRestaurantName ?? 'Restaurant',
          items: next,
        };
      }
    }
    set({
      cartItems: next,
      cartsByRestaurant: nextBuckets,
      cartRestaurantId: next.length === 0 ? null : state.cartRestaurantId,
      cartRestaurantName: next.length === 0 ? null : state.cartRestaurantName,
    });
  },

  removeItem: (lineId) => {
    const state = get();
    const next = state.cartItems.filter((i) => i.id !== lineId);
    const nextBuckets = { ...state.cartsByRestaurant };
    if (state.cartRestaurantId) {
      if (next.length === 0) {
        delete nextBuckets[state.cartRestaurantId];
      } else {
        nextBuckets[state.cartRestaurantId] = {
          restaurantName: state.cartRestaurantName ?? 'Restaurant',
          items: next,
        };
      }
    }
    set({
      cartItems: next,
      cartsByRestaurant: nextBuckets,
      cartRestaurantId: next.length === 0 ? null : state.cartRestaurantId,
      cartRestaurantName: next.length === 0 ? null : state.cartRestaurantName,
    });
  },

  applyCoupon: (code, discountMinor = 0) =>
    set({ appliedCouponCode: code, appliedDiscountMinor: code ? discountMinor : 0 }),
  clearCart: () => {
    const state = get();
    const nextBuckets = { ...state.cartsByRestaurant };
    if (state.cartRestaurantId) {
      delete nextBuckets[state.cartRestaurantId];
    }
    set({
      cartRestaurantId: null,
      cartRestaurantName: null,
      cartItems: [],
      cartsByRestaurant: nextBuckets,
      appliedCouponCode: null,
      appliedDiscountMinor: 0,
    });
  },
}));
