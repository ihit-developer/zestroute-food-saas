/**
 * Typography System (Master Prompt Section 5.3)
 * English: Inter | Urdu (RTL): Noto Sans Arabic
 */
export const FONT_FAMILIES = {
  english: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    webStack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  urdu: {
    regular: 'NotoSansArabic_400Regular',
    medium: 'NotoSansArabic_500Medium',
    semibold: 'NotoSansArabic_600SemiBold',
    bold: 'NotoSansArabic_700Bold',
    webStack: "'Noto Sans Arabic', 'Inter', sans-serif",
  },
} as const;

export const TYPOGRAPHY_SCALE = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },       // Main headings
  h2: { fontSize: 19, lineHeight: 26, fontWeight: '700' as const },       // Section headings
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },       // Card titles
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },     // Body text
  bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },// Supporting descriptions
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },    // Labels
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },   // Buttons
  nav: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },      // Navigation
  price: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },    // Price information
} as const;
