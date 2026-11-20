/**
 * Exact Color System from Master Prompt Section 5.2
 * Centralized across Mobile (React Native) and Web (React + Vite).
 */
export const PALETTE = {
  orange: '#F47B20',
  deepOrange: '#D95F16',
  warmYellow: '#FFC857',
  warmCream: '#FFF9F2',
  white: '#FFFFFF',
  espressoText: '#292522',
  warmGrayText: '#81776E',
  softSandBorder: '#F0E7DE',

  // Semantic Status Colors (Section 5.2)
  success: '#269B68',
  warning: '#E5A13B',
  error: '#D9534F',
  info: '#5187A8',

  // Harmonious Dark Surface Tokens
  darkBg: '#171412',
  darkCard: '#221D1A',
  darkElevated: '#2B2420',
  darkTextPrimary: '#FAF5F0',
  darkTextSecondary: '#B6ABA1',
  darkBorder: '#362E28',
} as const;

export interface AppThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  primarySoft: string;
  overlay: string;
  skeletonBase: string;
  skeletonHighlight: string;
}

export const LIGHT_THEME: AppThemeColors = {
  primary: PALETTE.orange,
  secondary: PALETTE.deepOrange,
  accent: PALETTE.warmYellow,
  background: PALETTE.warmCream,
  surface: PALETTE.white,
  surfaceElevated: '#FFFDF9',
  textPrimary: PALETTE.espressoText,
  textSecondary: PALETTE.warmGrayText,
  textOnPrimary: PALETTE.white,
  border: PALETTE.softSandBorder,
  success: PALETTE.success,
  successBg: '#EAF7F0',
  warning: PALETTE.warning,
  warningBg: '#FDF5E6',
  error: PALETTE.error,
  errorBg: '#FDECEC',
  info: PALETTE.info,
  infoBg: '#ECF3F8',
  primarySoft: '#FFF0E3',
  overlay: 'rgba(41, 37, 34, 0.45)',
  skeletonBase: '#F2E9DF',
  skeletonHighlight: '#FAF4ED',
};

export const DARK_THEME: AppThemeColors = {
  primary: PALETTE.orange,
  secondary: PALETTE.deepOrange,
  accent: PALETTE.warmYellow,
  background: PALETTE.darkBg,
  surface: PALETTE.darkCard,
  surfaceElevated: PALETTE.darkElevated,
  textPrimary: PALETTE.darkTextPrimary,
  textSecondary: PALETTE.darkTextSecondary,
  textOnPrimary: PALETTE.white,
  border: PALETTE.darkBorder,
  success: PALETTE.success,
  successBg: 'rgba(38, 155, 104, 0.16)',
  warning: PALETTE.warning,
  warningBg: 'rgba(229, 161, 59, 0.16)',
  error: PALETTE.error,
  errorBg: 'rgba(217, 83, 79, 0.16)',
  info: PALETTE.info,
  infoBg: 'rgba(81, 135, 168, 0.16)',
  primarySoft: 'rgba(244, 123, 32, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  skeletonBase: '#2A2420',
  skeletonHighlight: '#362F2A',
};

export type ThemeMode = 'light' | 'dark';
