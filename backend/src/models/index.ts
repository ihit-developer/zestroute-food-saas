export * from './user.models.js';
export * from './restaurant.models.js';
export * from './food.models.js';
export * from './order.models.js';
export * from './payment.models.js';
export * from './delivery.models.js';
export * from './marketing.models.js';
export * from './customer.models.js';
export * from './system.models.js';
export * from './subscription.models.js';

import {
  AddressModel,
  ProfileModel,
  UserDeviceModel,
  UserPreferenceModel,
  UserRoleModel,
  UserSessionModel,
} from './user.models.js';
import {
  RestaurantBranchModel,
  RestaurantDocumentModel,
  RestaurantHourModel,
  RestaurantModel,
  RestaurantStaffModel,
  RestaurantStaffPermissionModel,
} from './restaurant.models.js';
import {
  CategoryModel,
  FoodAddonModel,
  FoodImageModel,
  FoodItemAddonModel,
  FoodItemModel,
  FoodRecipeModel,
  FoodStockModel,
  FoodVariantModel,
  IngredientModel,
  RestaurantCategoryModel,
} from './food.models.js';
import {
  CartItemCustomizationModel,
  CartItemModel,
  CartModel,
  OrderCancellationModel,
  OrderItemCustomizationModel,
  OrderItemModel,
  OrderModel,
  OrderStatusHistoryModel,
} from './order.models.js';
import {
  CustomerWalletModel,
  PaymentModel,
  PaymentTransactionModel,
  RefundModel,
  RestaurantPayoutModel,
  RiderPayoutModel,
  WalletTransactionModel,
} from './payment.models.js';
import {
  DeliveryAssignmentModel,
  DeliveryModel,
  DeliveryStatusHistoryModel,
  RiderDocumentModel,
  RiderLocationModel,
  RiderModel,
} from './delivery.models.js';
import {
  CouponModel,
  CouponUsageModel,
  LoyaltyAccountModel,
  LoyaltyTransactionModel,
  MembershipPlanModel,
  PromotionalBannerModel,
  ReferralRecordModel,
} from './marketing.models.js';
import {
  ComplaintModel,
  FavoriteModel,
  NotificationModel,
  ReviewImageModel,
  ReviewModel,
  SupportMessageModel,
  SupportTicketModel,
} from './customer.models.js';
import {
  AppSettingModel,
  AuditLogModel,
  GroupOrderMemberModel,
  GroupOrderModel,
  ScheduledOrderModel,
  SystemLogModel,
} from './system.models.js';

export const ALL_MODELS = [
  ProfileModel,
  UserRoleModel,
  AddressModel,
  UserPreferenceModel,
  UserDeviceModel,
  UserSessionModel,
  RestaurantModel,
  RestaurantDocumentModel,
  RestaurantBranchModel,
  RestaurantHourModel,
  RestaurantStaffModel,
  RestaurantStaffPermissionModel,
  CategoryModel,
  RestaurantCategoryModel,
  FoodItemModel,
  FoodImageModel,
  FoodVariantModel,
  FoodAddonModel,
  FoodItemAddonModel,
  IngredientModel,
  FoodRecipeModel,
  FoodStockModel,
  CartModel,
  CartItemModel,
  CartItemCustomizationModel,
  OrderModel,
  OrderItemModel,
  OrderItemCustomizationModel,
  OrderStatusHistoryModel,
  OrderCancellationModel,
  PaymentModel,
  PaymentTransactionModel,
  RefundModel,
  CustomerWalletModel,
  WalletTransactionModel,
  RestaurantPayoutModel,
  RiderPayoutModel,
  RiderModel,
  RiderDocumentModel,
  DeliveryModel,
  DeliveryAssignmentModel,
  RiderLocationModel,
  DeliveryStatusHistoryModel,
  CouponModel,
  CouponUsageModel,
  PromotionalBannerModel,
  LoyaltyAccountModel,
  LoyaltyTransactionModel,
  ReferralRecordModel,
  MembershipPlanModel,
  FavoriteModel,
  ReviewModel,
  ReviewImageModel,
  NotificationModel,
  SupportTicketModel,
  SupportMessageModel,
  ComplaintModel,
  AppSettingModel,
  AuditLogModel,
  SystemLogModel,
  ScheduledOrderModel,
  GroupOrderModel,
  GroupOrderMemberModel,
] as const;
