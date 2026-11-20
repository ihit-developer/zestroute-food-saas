export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const RADII = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    web: '0 2px 8px rgba(41, 37, 34, 0.06)',
    native: {
      shadowColor: '#292522',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  },
  md: {
    web: '0 6px 20px rgba(41, 37, 34, 0.08)',
    native: {
      shadowColor: '#292522',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  lg: {
    web: '0 12px 32px rgba(41, 37, 34, 0.12)',
    native: {
      shadowColor: '#292522',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 8,
    },
  },
} as const;

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;
