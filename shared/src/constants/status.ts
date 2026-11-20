export type SemanticTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral';

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  RIDER_ASSIGNED: 'rider_assigned',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { labelEn: string; labelUr: string; tone: SemanticTone }
> = {
  pending: { labelEn: 'Pending', labelUr: 'زیر التواء', tone: 'warning' },
  confirmed: { labelEn: 'Confirmed', labelUr: 'تصدیق شدہ', tone: 'info' },
  preparing: { labelEn: 'Preparing', labelUr: 'تیار ہو رہا ہے', tone: 'primary' },
  ready_for_pickup: { labelEn: 'Ready for Pickup', labelUr: 'پک اپ کے لیے تیار', tone: 'info' },
  rider_assigned: { labelEn: 'Rider Assigned', labelUr: 'رائیڈر مقرر', tone: 'info' },
  picked_up: { labelEn: 'Picked Up', labelUr: 'اٹھا لیا گیا', tone: 'primary' },
  on_the_way: { labelEn: 'On the Way', labelUr: 'راستے میں', tone: 'primary' },
  delivered: { labelEn: 'Delivered', labelUr: 'پہنچا دیا گیا', tone: 'success' },
  rejected: { labelEn: 'Rejected', labelUr: 'مسترد', tone: 'error' },
  cancelled: { labelEn: 'Cancelled', labelUr: 'منسوخ', tone: 'error' },
  refund_pending: { labelEn: 'Refund Pending', labelUr: 'رقم واپسی زیر التواء', tone: 'warning' },
  refunded: { labelEn: 'Refunded', labelUr: 'رقم واپس', tone: 'neutral' },
};

export const APPROVAL_STATUS_META: Record<
  ApprovalStatus,
  { labelEn: string; labelUr: string; tone: SemanticTone }
> = {
  pending: { labelEn: 'Pending', labelUr: 'زیر التواء', tone: 'warning' },
  under_review: { labelEn: 'Under Review', labelUr: 'زیر جائزہ', tone: 'info' },
  approved: { labelEn: 'Approved', labelUr: 'منظور شدہ', tone: 'success' },
  rejected: { labelEn: 'Rejected', labelUr: 'مسترد', tone: 'error' },
  suspended: { labelEn: 'Suspended', labelUr: 'معطل', tone: 'error' },
};
