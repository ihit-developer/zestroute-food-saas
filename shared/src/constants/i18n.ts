export type SupportedLocale = 'en' | 'ur';

export function isRTL(locale: SupportedLocale): boolean {
  return locale === 'ur';
}

export const COMMON_STRINGS: Record<
  SupportedLocale,
  {
    brandName: string;
    brandTagline: string;
    searchPlaceholder: string;
    addToCart: string;
    openNow: string;
    closed: string;
    freeDelivery: string;
    minOrder: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    noResults: string;
    somethingWentWrong: string;
    loading: string;
    off: string;
    mins: string;
    previous: string;
    next: string;
  }
> = {
  en: {
    brandName: 'ZestRoute',
    brandTagline: 'Fresh food, delivered fast',
    searchPlaceholder: 'Search restaurants, dishes, or cuisines...',
    addToCart: 'Add to Cart',
    openNow: 'Open',
    closed: 'Closed',
    freeDelivery: 'Free Delivery',
    minOrder: 'Min',
    retry: 'Try Again',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    noResults: 'Nothing here yet',
    somethingWentWrong: 'Something went wrong',
    loading: 'Loading...',
    off: 'OFF',
    mins: 'mins',
    previous: 'Previous',
    next: 'Next',
  },
  ur: {
    brandName: 'زیسٹ روٹ',
    brandTagline: 'تازہ کھانا، تیز ترسیل',
    searchPlaceholder: 'ریستوران، کھانے یا ذائقے تلاش کریں...',
    addToCart: 'کارٹ میں شامل کریں',
    openNow: 'کھلا ہے',
    closed: 'بند ہے',
    freeDelivery: 'مفت ڈلیوری',
    minOrder: 'کم از کم',
    retry: 'دوبارہ کوشش کریں',
    cancel: 'منسوخ کریں',
    confirm: 'تصدیق کریں',
    save: 'محفوظ کریں',
    noResults: 'ابھی کوئی مواد موجود نہیں',
    somethingWentWrong: 'کچھ غلط ہو گیا',
    loading: 'لوڈ ہو رہا ہے...',
    off: 'رعایت',
    mins: 'منٹ',
    previous: 'پچھلا',
    next: 'اگلا',
  },
};
