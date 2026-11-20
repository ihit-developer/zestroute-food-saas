import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, MapPin, MessageSquare, RefreshCw, Star, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { API_BASE_URL, httpClient, tokenStorage } from '../../services/apiClient';
import {
  ConfirmationDialog,
  IconButton,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TopNav,
  useToast,
} from '../../components/ui';

interface OrderItemDetail {
  _id: string;
  nameSnapshot: string;
  variantNameSnapshot?: string;
  quantity: number;
  lineTotalMinor: number;
}

interface OrderDetailRecord {
  _id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  taxMinor: number;
  tipMinor: number;
  totalMinor: number;
  currency: string;
  deliveryOtp?: string;
  deliveryAddressSnapshot?: {
    fullName?: string;
    phone?: string;
    houseNumber?: string;
    street?: string;
    area?: string;
    city?: string;
  };
}

interface OrderReviewRecord {
  _id: string;
  restaurantRating: number;
  foodRating: number;
  comment?: string;
  ownerReply?: string;
  ownerRepliedAt?: string;
}

interface OrderRefundRecord {
  _id: string;
  amountMinor: number;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'processed';
  adminNotes?: string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { showToast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind / order issue');
  const [reviewText, setReviewText] = useState('');
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [review, setReview] = useState<OrderReviewRecord | null>(null);
  const [refund, setRefund] = useState<OrderRefundRecord | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await httpClient.get<{
        order: OrderDetailRecord;
        items: OrderItemDetail[];
        review?: OrderReviewRecord | null;
        refund?: OrderRefundRecord | null;
      }>(`/orders/${id}`);
      setOrder(data.order);
      setItems(data.items ?? []);
      setReview(data.review ?? null);
      setRefund(data.refund ?? null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
    const timer = setInterval(() => {
      void loadOrder();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadOrder]);

  const formatMoney = (minor: number, currency = order?.currency ?? 'PKR') =>
    `${currency} ${(minor / 100).toFixed(2)}`;

  const handleDownloadInvoice = async () => {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/orders/${id}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const doc = (
        globalThis as {
          document?: {
            createElement: (tag: string) => {
              href: string;
              download: string;
              click: () => void;
              remove: () => void;
            };
            body: { appendChild: (el: unknown) => void };
          };
        }
      ).document;
      if (Platform.OS === 'web' && doc) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = doc.createElement('a');
        anchor.href = url;
        anchor.download = `invoice-${order?.orderNumber ?? id}.pdf`;
        doc.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast('Invoice PDF downloaded', 'success');
      } else {
        const itemLines = items
          .map((item) => `${item.quantity}x ${item.nameSnapshot} - ${formatMoney(item.lineTotalMinor)}`)
          .join('\n');
        await Share.share({
          title: `Invoice ${order?.orderNumber ?? id}`,
          message: `ZestRoute Invoice ${order?.orderNumber ?? id}\nStatus: ${order?.status ?? ''}\n${itemLines}\nTotal: ${formatMoney(order?.totalMinor ?? 0)}`,
        });
        showToast('Invoice ready to share', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to download invoice PDF', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    setSubmittingReview(true);
    try {
      await httpClient.post('/reviews', {
        orderId: id,
        restaurantRating,
        foodRating,
        deliveryRating,
        comment: reviewText.trim() || undefined,
      });
      setReviewOpen(false);
      setReviewText('');
      showToast('Thank you! Your review has been posted.', 'success');
      await loadOrder();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrRefund = async () => {
    if (!id) return;
    setCancelOpen(false);
    try {
      await httpClient.post(`/orders/${id}/cancel`, {
        reason: cancelReason.trim() || 'Customer requested cancellation / refund',
      });
      showToast('Cancellation / refund request submitted!', 'success');
      await loadOrder();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit request', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    setDeleteOpen(false);
    if (!id) return;
    try {
      await httpClient.del(`/orders/${id}`);
      showToast('Order deleted', 'success');
      router.replace('/(tabs)/orders');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete order', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={`Order ${order?.orderNumber ?? id ?? ''}`}
        subtitle="Order summary, refund & review"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        rightAction={
          <IconButton
            icon={<RefreshCw size={18} color={colors.textPrimary} />}
            accessibilityLabel="Refresh"
            onPress={() => void loadOrder()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {order?.deliveryOtp &&
        !['delivered', 'cancelled', 'rejected', 'refunded'].includes(order.status) ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
                borderWidth: 1.5,
                borderRadius: radii.lg,
                alignItems: 'center',
              },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1 }}>
              DELIVERY CONFIRMATION OTP
            </Text>
            <Text
              style={{
                fontSize: 30,
                fontWeight: '900',
                letterSpacing: 10,
                color: colors.textPrimary,
                marginVertical: 2,
              }}
            >
              {order.deliveryOtp}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Give this 4-digit OTP to your Rider when they deliver your order.
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Status</Text>
            <StatusBadge
              label={order ? order.status.replace(/_/g, ' ').toUpperCase() : loading ? 'Loading...' : 'Unavailable'}
              tone={
                order?.status === 'delivered' || order?.status === 'refunded'
                  ? 'success'
                  : order?.status === 'cancelled' || order?.status === 'rejected'
                    ? 'error'
                    : 'info'
              }
            />
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : order ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Payment: {order.paymentMethod.toUpperCase()} ({order.paymentStatus.toUpperCase()})
              </Text>
              {order.deliveryAddressSnapshot ? (
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Deliver to:{' '}
                  {[
                    order.deliveryAddressSnapshot.houseNumber,
                    order.deliveryAddressSnapshot.street,
                    order.deliveryAddressSnapshot.area,
                    order.deliveryAddressSnapshot.city,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : null}
              {items.map((item) => (
                <View key={item._id} style={styles.rowBetween}>
                  <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                    {item.quantity}× {item.nameSnapshot}
                    {item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ''}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                    {formatMoney(item.lineTotalMinor)}
                  </Text>
                </View>
              ))}
              <View style={[styles.rowBetween, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Total</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>
                  {formatMoney(order.totalMinor)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Unable to load order details. Please sign in and try again.
            </Text>
          )}
        </View>

        {/* Live Refund / Cancellation Status Card */}
        {refund ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                Cancellation / Refund Status
              </Text>
              <StatusBadge
                label={
                  refund.status === 'processed'
                    ? 'Refunded to Wallet'
                    : refund.status === 'rejected'
                      ? 'Rejected'
                      : 'Under Review'
                }
                tone={
                  refund.status === 'processed'
                    ? 'success'
                    : refund.status === 'rejected'
                      ? 'error'
                      : 'warning'
                }
              />
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{refund.reason}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              Amount: {formatMoney(refund.amountMinor)}
            </Text>
            {refund.adminNotes ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Admin Note: {refund.adminNotes}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Live Customer Review & Restaurant Reply Card */}
        {review ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
            <View style={styles.rowBetween}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Your Review</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                ★ {review.restaurantRating}/5 · Food ★ {review.foodRating}/5
              </Text>
            </View>
            {review.comment ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{review.comment}</Text>
            ) : null}
            {review.ownerReply ? (
              <View
                style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: radii.md,
                  backgroundColor: colors.primarySoft,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                    Restaurant Reply
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textPrimary }}>{review.ownerReply}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Awaiting reply from restaurant...
              </Text>
            )}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <PrimaryButton
            title="Track Live Order"
            leftIcon={<MapPin size={16} color="#FFFFFF" />}
            fullWidth
            onPress={() => router.push(`/order/tracking/${id ?? 'current'}`)}
          />
          <SecondaryButton
            title={downloadingPdf ? 'Generating PDF...' : 'Download PDF Invoice'}
            leftIcon={<FileText size={16} color={colors.textPrimary} />}
            fullWidth
            disabled={downloadingPdf}
            onPress={() => void handleDownloadInvoice()}
          />
          {!review ? (
            <SecondaryButton
              title="Submit Review"
              leftIcon={<Star size={16} color={colors.primary} />}
              fullWidth
              onPress={() => setReviewOpen(true)}
            />
          ) : null}
          {order && !['cancelled', 'rejected', 'refunded', 'refund_pending'].includes(order.status) ? (
            <SecondaryButton
              title="Request Cancellation / Refund"
              fullWidth
              onPress={() => setCancelOpen(true)}
            />
          ) : null}
          <SecondaryButton
            title="Delete Order"
            leftIcon={<Trash2 size={16} color={colors.error} />}
            fullWidth
            onPress={() => setDeleteOpen(true)}
          />
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={reviewOpen} onClose={() => setReviewOpen(false)} title="Rate Your Order">
        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Restaurant Rating ({restaurantRating}/5)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={`r-${n}`} onPress={() => setRestaurantRating(n)} hitSlop={6}>
                  <Star
                    size={26}
                    color={n <= restaurantRating ? colors.accent : colors.border}
                    fill={n <= restaurantRating ? colors.accent : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Food Quality ({foodRating}/5)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={`f-${n}`} onPress={() => setFoodRating(n)} hitSlop={6}>
                  <Star
                    size={26}
                    color={n <= foodRating ? colors.primary : colors.border}
                    fill={n <= foodRating ? colors.primary : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Delivery Rider Rating ({deliveryRating}/5)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={`d-${n}`} onPress={() => setDeliveryRating(n)} hitSlop={6}>
                  <Star
                    size={26}
                    color={n <= deliveryRating ? '#16A34A' : colors.border}
                    fill={n <= deliveryRating ? '#16A34A' : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <InputField
            label="Written Feedback"
            placeholder="Share your experience with the food and delivery..."
            value={reviewText}
            onChangeText={setReviewText}
          />
          <PrimaryButton
            title={submittingReview ? 'Submitting...' : 'Submit Review'}
            fullWidth
            disabled={submittingReview}
            onPress={() => void handleSubmitReview()}
          />
        </View>
      </Modal>

      {/* Cancellation / Refund Modal with Reason */}
      <Modal visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel / Request Refund">
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Pending/accepted orders cancel immediately; preparing/delivered orders submit a refund request to Admin &amp; Restaurant.
          </Text>
          <InputField
            label="Reason"
            placeholder="Explain why you want to cancel or request a refund..."
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <PrimaryButton
            title="Submit Request"
            fullWidth
            onPress={() => void handleCancelOrRefund()}
          />
        </View>
      </Modal>

      <ConfirmationDialog
        visible={deleteOpen}
        title="Delete Order?"
        message="This will permanently remove this order from your order history."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteOrder()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
