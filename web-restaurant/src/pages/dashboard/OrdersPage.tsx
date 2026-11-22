import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { ApiClientError, ORDER_STATUS_META, formatMoney } from '@zestroute/shared';
import {
  Dropdown,
  EmptyState,
  ErrorState,
  InputField,
  LoadingSkeleton,
  Modal,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../../components/ui';
import {
  useRestaurantList,
  useRestaurantOrders,
  type RestaurantOrderRow,
} from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

const WORKFLOW_STEPS = [
  { key: 'pending', label: '1. New Order' },
  { key: 'confirmed', label: '2. Accepted' },
  { key: 'preparing', label: '3. Preparing' },
  { key: 'ready_for_pickup', label: '4. Ready (Kitchen)' },
  { key: 'on_the_way', label: '5. With Rider' },
  { key: 'delivered', label: '6. Delivered' },
] as const;

interface MenuOption {
  id: string;
  name: string;
  regularPriceMinor: number;
}

function getStepIndex(status: string): number {
  if (status === 'pending') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'preparing') return 2;
  if (status === 'ready_for_pickup') return 3;
  if (['rider_assigned', 'picked_up', 'on_the_way'].includes(status)) return 4;
  if (status === 'delivered') return 5;
  return -1;
}

function getNextAction(status: string): { nextStatus: string; label: string } | null {
  if (status === 'pending') return { nextStatus: 'confirmed', label: 'Accept Order' };
  if (status === 'confirmed') return { nextStatus: 'preparing', label: 'Start Preparing' };
  if (status === 'preparing') return { nextStatus: 'ready_for_pickup', label: 'Ready & Dispatch Rider' };
  return null;
}

function getRiderHandoffLabel(status: string): { text: string; color: string; bg: string } | null {
  if (status === 'ready_for_pickup') {
    return {
      text: 'Dispatched · Waiting for Rider to Accept',
      color: '#C2410C',
      bg: 'rgba(244, 123, 32, 0.14)',
    };
  }
  if (status === 'rider_assigned') {
    return {
      text: 'Rider Assigned · Heading to Kitchen',
      color: '#1D4ED8',
      bg: 'rgba(37, 99, 235, 0.12)',
    };
  }
  if (status === 'picked_up') {
    return {
      text: 'Rider Picked Up Food',
      color: '#6D28D9',
      bg: 'rgba(124, 58, 237, 0.12)',
    };
  }
  if (status === 'on_the_way') {
    return {
      text: 'Rider On The Way to Customer',
      color: '#15803D',
      bg: 'rgba(22, 163, 74, 0.14)',
    };
  }
  if (status === 'delivered') {
    return {
      text: 'Delivered by Rider (OTP Verified)',
      color: '#15803D',
      bg: 'rgba(22, 163, 74, 0.14)',
    };
  }
  return null;
}

export const OrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<RestaurantOrderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantOrderRow | null>(null);
  const [editTarget, setEditTarget] = useState<RestaurantOrderRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // Create form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newFoodId, setNewFoodId] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPaymentMethod, setNewPaymentMethod] = useState('cod');

  // Edit form state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('pending');
  const [editStatus, setEditStatus] = useState('pending');

  const { data, isLoading, isError, refetch } = useRestaurantOrders(tab);
  const { data: menuFoods } = useRestaurantList<MenuOption>('foods');

  const invalidateOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'orders'] });
    await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'dashboard'] });
  };

  const handleTransition = async (order: RestaurantOrderRow, nextStatus: string) => {
    if (!restaurantId) return;
    setBusyOrderId(order.id);
    try {
      await restaurantHttpClient.patch(
        `/restaurant/${restaurantId}/orders/${order.id}/status`,
        { status: nextStatus }
      );
      await invalidateOrders();
      showToast(`Order ${order.orderNumber} updated to ${nextStatus.replace(/_/g, ' ')}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update order status', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCreateOrder = async () => {
    if (!restaurantId || !newCustomerName.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    try {
      await restaurantHttpClient.post(`/restaurant/${restaurantId}/orders`, {
        customerName: newCustomerName.trim(),
        customerPhone: newCustomerPhone.trim(),
        deliveryAddress: newAddress.trim(),
        foodItemId: newFoodId || menuFoods[0]?.id,
        quantity: Math.max(1, Number(newQty) || 1),
        paymentMethod: newPaymentMethod,
      });
      await invalidateOrders();
      setCreateOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewAddress('');
      setNewQty('1');
      showToast('Order created!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to create order', 'error');
    }
  };

  const openEdit = (order: RestaurantOrderRow) => {
    setEditTarget(order);
    setEditCustomerName(order.customerName);
    setEditCustomerPhone(order.customerPhone ?? '');
    setEditAddress(order.deliveryAddress ?? '');
    setEditPaymentStatus(order.paymentStatus);
    setEditStatus(order.status);
  };

  const handleSaveEdit = async () => {
    if (!restaurantId || !editTarget) return;
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/orders/${editTarget.id}`, {
        customerName: editCustomerName.trim(),
        customerPhone: editCustomerPhone.trim(),
        deliveryAddress: editAddress.trim(),
        paymentStatus: editPaymentStatus,
        status: editStatus,
      });
      await invalidateOrders();
      setEditTarget(null);
      showToast('Order updated!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update order', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    if (!restaurantId || !deleteTarget) return;
    setBusyOrderId(deleteTarget.id);
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/orders/${deleteTarget.id}`);
      await invalidateOrders();
      showToast(`Order ${deleteTarget.orderNumber} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete order', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = data.filter((o) => {
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.itemsSummary.toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? timeDiff : -timeDiff;
    });
    return sorted;
  }, [data, search, sortAsc]);

  const handlePrintReceipt = (order: RestaurantOrderRow) => {
    const win = window.open('', '_blank', 'width=460,height=740');
    if (!win) {
      window.print();
      return;
    }
    const itemsHtml =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (item) => `<tr>
                <td>${item.quantity}x</td>
                <td>${item.name}${item.variantName ? ` (${item.variantName})` : ''}</td>
                <td style="text-align:right">${formatMoney(item.unitPriceMinor)}</td>
                <td style="text-align:right"><strong>${formatMoney(item.lineTotalMinor)}</strong></td>
              </tr>`
            )
            .join('')
        : `<tr><td colspan="4">${order.itemsSummary}</td></tr>`;

    const statusLabel = ORDER_STATUS_META[order.status]?.labelEn ?? order.status;
    win.document.write(`<!doctype html>
<html>
<head>
  <title>Receipt ${order.orderNumber}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1f1c19; max-width: 400px; margin: 0 auto; }
    .brand { text-align: center; border-bottom: 2px dashed #d4cec8; padding-bottom: 12px; margin-bottom: 14px; }
    .brand h2 { margin: 0; color: #F47B20; font-size: 20px; }
    .brand p { margin: 4px 0 0; font-size: 12px; color: #6b635b; }
    .meta { font-size: 12.5px; line-height: 1.65; margin-bottom: 12px; }
    .meta div { display: flex; justify-content: space-between; gap: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
    th { text-align: left; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 6px 2px; font-size: 11px; text-transform: uppercase; color: #6b635b; }
    td { padding: 6px 2px; border-bottom: 1px dotted #eee; vertical-align: top; }
    .totals { border-top: 2px dashed #d4cec8; padding-top: 10px; font-size: 13px; }
    .totals .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .totals .grand { font-size: 16px; font-weight: 800; color: #F47B20; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e0db; }
    .footer { text-align: center; margin-top: 18px; font-size: 11.5px; color: #6b635b; }
  </style>
</head>
<body>
  <div class="brand">
    <h2>${order.restaurantName || 'Dastarkhwan Kitchen'}</h2>
    <p>OFFICIAL ORDER RECEIPT &amp; KITCHEN TICKET</p>
  </div>
  <div class="meta">
    <div><span>Order #:</span><strong>${order.orderNumber}</strong></div>
    <div><span>Date:</span><span>${new Date(order.createdAt).toLocaleString()}</span></div>
    <div><span>Status:</span><strong>${statusLabel}</strong></div>
    <div><span>Customer:</span><strong>${order.customerName}</strong></div>
    ${order.customerPhone ? `<div><span>Phone:</span><span>${order.customerPhone}</span></div>` : ''}
    ${order.deliveryAddress ? `<div><span>Address:</span><span style="text-align:right">${order.deliveryAddress}</span></div>` : ''}
    <div><span>Payment:</span><span>${(order.paymentMethod ?? 'cod').toUpperCase()} (${order.paymentStatus.toUpperCase()})</span></div>
  </div>
  <table>
    <thead><tr><th>Qty</th><th>Dish</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatMoney(order.subtotalMinor ?? order.totalMinor)}</span></div>
    ${order.discountMinor ? `<div class="row"><span>Discount</span><span>-${formatMoney(order.discountMinor)}</span></div>` : ''}
    <div class="row"><span>Delivery Fee</span><span>${formatMoney(order.deliveryFeeMinor ?? 0)}</span></div>
    <div class="row"><span>Tax</span><span>${formatMoney(order.taxMinor ?? 0)}</span></div>
    ${order.tipMinor ? `<div class="row"><span>Tip</span><span>${formatMoney(order.tipMinor)}</span></div>` : ''}
    <div class="row grand"><span>GRAND TOTAL</span><span>${formatMoney(order.totalMinor)}</span></div>
  </div>
  <div class="footer">
    <p>Thank you for ordering with Dastarkhwan!</p>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Live Kitchen Orders</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Sequential order numbers (small → big) synced in real time with full CRUD &amp; printable receipts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SecondaryButton
            leftIcon={<ArrowUpDown size={15} />}
            onClick={() => setSortAsc((v) => !v)}
          >
            {sortAsc ? 'Oldest First' : 'Newest First'}
          </SecondaryButton>
          <SecondaryButton leftIcon={<RefreshCw size={15} />} onClick={() => void refetch()}>
            Refresh
          </SecondaryButton>
          <PrimaryButton
            leftIcon={<Plus size={15} />}
            onClick={() => {
              if (!newFoodId && menuFoods[0]?.id) setNewFoodId(menuFoods[0].id);
              setCreateOpen(true);
            }}
          >
            New Order
          </PrimaryButton>
        </div>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          items={[
            { key: 'all', label: 'All Orders' },
            { key: 'new', label: 'New' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'preparing', label: 'Preparing' },
            { key: 'ready', label: 'Ready' },
            { key: 'completed', label: 'Completed' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
        <div style={{ minWidth: 240, flex: '0 1 320px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search Order # or customer..." />
        </div>
      </div>

      {/* Order Cards Pipeline */}
      {isLoading ? (
        <LoadingSkeleton height={220} />
      ) : isError ? (
        <ErrorState message="Could not load restaurant orders." onRetry={() => void refetch()} />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          title={`No ${tab === 'all' ? '' : `${tab} `}orders yet`}
          description="Incoming customer orders appear automatically in real time, or create a walk-in order manually."
          actionLabel="Create Manual Order"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visibleOrders.map((order) => {
            const meta = ORDER_STATUS_META[order.status] ?? {
              labelEn: String(order.status).replace(/_/g, ' ').toUpperCase(),
              tone: 'info' as const,
            };
            const stepIdx = getStepIndex(order.status);
            const nextAction = getNextAction(order.status);
            const isBusy = busyOrderId === order.id;

            return (
              <div
                key={order.id}
                className="zr-card"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 18 }}>{order.orderNumber}</strong>
                      <StatusBadge label={meta.labelEn} tone={meta.tone} />
                      <StatusBadge
                        label={`${(order.paymentMethod ?? 'cod').toUpperCase()} · ${order.paymentStatus.toUpperCase()}`}
                        tone={order.paymentStatus === 'paid' ? 'success' : 'info'}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                      <Clock size={13} />
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>Order Total</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--zr-primary, #F47B20)' }}>
                      {formatMoney(order.totalMinor)}
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Visual Progress Bar */}
                {stepIdx >= 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, minmax(90px, 1fr))',
                      gap: 8,
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--zr-bg-subtle, rgba(244, 123, 32, 0.05))',
                      overflowX: 'auto',
                    }}
                  >
                    {WORKFLOW_STEPS.map((st, idx) => {
                      const done = idx < stepIdx;
                      const current = idx === stepIdx;
                      return (
                        <div
                          key={st.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: current || done ? 700 : 500,
                            background: current
                              ? 'var(--zr-primary, #F47B20)'
                              : done
                                ? 'rgba(34, 197, 94, 0.14)'
                                : 'transparent',
                            color: current
                              ? '#FFFFFF'
                              : done
                                ? '#15803d'
                                : 'var(--zr-text-secondary)',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Customer Info + Itemized Dish Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: 'var(--zr-text-secondary)' }}>
                      Customer &amp; Delivery
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} /> <strong>{order.customerName}</strong>
                    </div>
                    {order.customerPhone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--zr-text-secondary)' }}>
                        <Phone size={14} /> <span>{order.customerPhone}</span>
                      </div>
                    ) : null}
                    {order.deliveryAddress ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--zr-text-secondary)' }}>
                        <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{order.deliveryAddress}</span>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: 'var(--zr-text-secondary)' }}>
                      Ordered Dishes
                    </div>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={`${item.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span>
                            <strong>{item.quantity}×</strong> {item.name}
                            {item.variantName ? ` (${item.variantName})` : ''}
                          </span>
                          <span style={{ fontWeight: 600 }}>{formatMoney(item.lineTotalMinor)}</span>
                        </div>
                      ))
                    ) : (
                      <div>{order.itemsSummary}</div>
                    )}
                  </div>
                </div>

                {/* Action Bar (CRUD + Step Advance + Receipt) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    paddingTop: 12,
                    borderTop: '1px solid var(--zr-border)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <SecondaryButton leftIcon={<Receipt size={15} />} onClick={() => setReceiptOrder(order)}>
                      View Receipt
                    </SecondaryButton>
                    <SecondaryButton leftIcon={<Printer size={15} />} onClick={() => handlePrintReceipt(order)}>
                      Print
                    </SecondaryButton>
                    <SecondaryButton leftIcon={<Pencil size={14} />} onClick={() => openEdit(order)}>
                      Edit
                    </SecondaryButton>
                    <SecondaryButton leftIcon={<Trash2 size={14} />} onClick={() => setDeleteTarget(order)}>
                      Delete
                    </SecondaryButton>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(() => {
                      const handoff = getRiderHandoffLabel(order.status);
                      return handoff ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: handoff.color,
                            background: handoff.bg,
                            padding: '7px 12px',
                            borderRadius: 999,
                          }}
                        >
                          {handoff.text}
                        </span>
                      ) : null;
                    })()}
                    {order.status === 'pending' ? (
                      <SecondaryButton
                        leftIcon={<XCircle size={15} />}
                        disabled={isBusy}
                        onClick={() => void handleTransition(order, 'rejected')}
                      >
                        Reject Order
                      </SecondaryButton>
                    ) : null}
                    {nextAction ? (
                      <PrimaryButton
                        disabled={isBusy}
                        onClick={() => void handleTransition(order, nextAction.nextStatus)}
                      >
                        {isBusy ? 'Updating...' : nextAction.label}
                      </PrimaryButton>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Manual Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Manual / Walk-In Order"
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleCreateOrder()}>Create Order</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField
            label="Customer Name"
            placeholder="e.g., Ali Hassan"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
          />
          <InputField
            label="Phone Number"
            placeholder="03001234567"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
          />
          <InputField
            label="Delivery / Pickup Address"
            placeholder="Counter Pickup or Street Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          {menuFoods.length > 0 ? (
            <Dropdown
              label="Menu Dish"
              value={newFoodId || menuFoods[0].id}
              onChange={setNewFoodId}
              options={menuFoods.map((f) => ({
                label: `${f.name} (${formatMoney(f.regularPriceMinor)})`,
                value: f.id,
              }))}
            />
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Quantity" type="number" min={1} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            <Dropdown
              label="Payment Method"
              value={newPaymentMethod}
              onChange={setNewPaymentMethod}
              options={[
                { label: 'Cash on Delivery', value: 'cod' },
                { label: 'Card', value: 'card' },
                { label: 'JazzCash', value: 'jazzcash' },
                { label: 'Easypaisa', value: 'easypaisa' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Edit Order · ${editTarget?.orderNumber ?? ''}`}
        footer={
          <>
            <SecondaryButton onClick={() => setEditTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSaveEdit()}>Save Changes</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Customer Name" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} />
          <InputField label="Customer Phone" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} />
          <InputField label="Delivery Address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Dropdown
              label="Order Status"
              value={editStatus}
              onChange={setEditStatus}
              options={[
                { label: 'New (Pending)', value: 'pending' },
                { label: 'Accepted (Confirmed)', value: 'confirmed' },
                { label: 'Preparing', value: 'preparing' },
                { label: 'Ready for Pickup', value: 'ready_for_pickup' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />
            <Dropdown
              label="Payment Status"
              value={editPaymentStatus}
              onChange={setEditPaymentStatus}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Paid', value: 'paid' },
                { label: 'Failed', value: 'failed' },
                { label: 'Refunded', value: 'refunded' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Order?"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleDeleteOrder()}>
              {busyOrderId ? 'Deleting...' : 'Delete Permanently'}
            </PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Are you sure you want to delete order <strong>{deleteTarget?.orderNumber}</strong>?
        </p>
      </Modal>

      {/* Detailed Receipt Preview Modal */}
      <Modal
        open={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
        title={`Receipt · ${receiptOrder?.orderNumber ?? ''}`}
        footer={
          <>
            <SecondaryButton onClick={() => setReceiptOrder(null)}>Close</SecondaryButton>
            {receiptOrder ? (
              <PrimaryButton leftIcon={<Printer size={15} />} onClick={() => handlePrintReceipt(receiptOrder)}>
                Print Receipt
              </PrimaryButton>
            ) : null}
          </>
        }
      >
        {receiptOrder ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
            <div style={{ textAlign: 'center', paddingBottom: 10, borderBottom: '1px dashed var(--zr-border)' }}>
              <strong style={{ fontSize: 17, color: 'var(--zr-primary, #F47B20)' }}>
                {receiptOrder.restaurantName || 'Dastarkhwan Kitchen'}
              </strong>
              <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)', marginTop: 2 }}>
                {new Date(receiptOrder.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Order #:</strong> {receiptOrder.orderNumber}</div>
              <div><strong>Status:</strong> {ORDER_STATUS_META[receiptOrder.status]?.labelEn ?? receiptOrder.status}</div>
              <div><strong>Customer:</strong> {receiptOrder.customerName} {receiptOrder.customerPhone ? `(${receiptOrder.customerPhone})` : ''}</div>
              {receiptOrder.deliveryAddress ? (
                <div><strong>Delivery Address:</strong> {receiptOrder.deliveryAddress}</div>
              ) : null}
              <div><strong>Payment:</strong> {(receiptOrder.paymentMethod ?? 'cod').toUpperCase()} ({receiptOrder.paymentStatus.toUpperCase()})</div>
            </div>

            <div style={{ borderTop: '1px dashed var(--zr-border)', borderBottom: '1px dashed var(--zr-border)', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {receiptOrder.items && receiptOrder.items.length > 0 ? (
                receiptOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>
                      <strong>{item.quantity}×</strong> {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </span>
                    <strong>{formatMoney(item.lineTotalMinor)}</strong>
                  </div>
                ))
              ) : (
                <div>{receiptOrder.itemsSummary}</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{formatMoney(receiptOrder.subtotalMinor ?? receiptOrder.totalMinor)}</span>
              </div>
              {receiptOrder.discountMinor ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount</span>
                  <span>-{formatMoney(receiptOrder.discountMinor)}</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Fee</span>
                <span>{formatMoney(receiptOrder.deliveryFeeMinor ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax</span>
                <span>{formatMoney(receiptOrder.taxMinor ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--zr-primary, #F47B20)', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--zr-border)' }}>
                <span>Grand Total</span>
                <span>{formatMoney(receiptOrder.totalMinor)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
