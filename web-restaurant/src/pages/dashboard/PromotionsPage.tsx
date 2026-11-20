import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Copy, Plus, Power, Tag, Trash2 } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
  DatePicker,
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface PromoRow {
  id: string;
  title: string;
  type: string;
  validity: string;
  isActive: boolean;
}

export const PromotionsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoRow | null>(null);
  const [title, setTitle] = useState('');
  const [promoType, setPromoType] = useState('percent');
  const [value, setValue] = useState('15');
  const [startDate, setStartDate] = useState('2026-11-19');
  const [endDate, setEndDate] = useState('2026-12-19');
  const { data } = useRestaurantList<PromoRow>('promotions');

  const handleCreate = async () => {
    if (!restaurantId || !title.trim()) {
      showToast('Promotion code is required', 'error');
      return;
    }
    try {
      await restaurantHttpClient.post(`/restaurant/${restaurantId}/promotions`, {
        title: title.trim(),
        discountType: promoType,
        value: promoType === 'fixed' ? Math.round((Number(value) || 0) * 100) : Number(value) || 0,
        startsAt: new Date(startDate).toISOString(),
        expiresAt: new Date(endDate).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'promotions'] });
      setModalOpen(false);
      setTitle('');
      showToast('Promo campaign saved to MongoDB!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to create promotion', 'error');
    }
  };

  const handleToggle = async (r: PromoRow) => {
    if (!restaurantId) return;
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/promotions/${r.id}`, {
        isActive: !r.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'promotions'] });
      showToast(`${r.title} marked ${!r.isActive ? 'Active' : 'Paused'}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update promotion', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!restaurantId || !deleteTarget) return;
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/promotions/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'promotions'] });
      showToast(`${deleteTarget.title} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete promotion', 'error');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Copied promo code "${code}"!`, 'success');
  };

  const activeCount = data.filter((p) => p.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Restaurant Promotions &amp; Coupons</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Create live promo codes validated automatically in the Customer Mobile App cart.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Create Promo Code
        </PrimaryButton>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Campaigns', val: String(data.length), color: 'var(--zr-text)' },
          { label: 'Active Now', val: String(activeCount), color: '#15803d' },
          { label: 'Paused', val: String(data.length - activeCount), color: 'var(--zr-text-secondary)' },
        ].map((kpi) => (
          <div key={kpi.label} className="zr-card" style={{ padding: 16, borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Modern Promo Ticket Cards Grid */}
      {data.length === 0 ? (
        <EmptyState
          title="No active promotions"
          description="Create promo codes like WEEKEND20 or SAVE150 so customers can apply them in their cart."
          actionLabel="Create First Promo"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {data.map((promo) => (
            <div
              key={promo.id}
              className="zr-card"
              style={{
                overflow: 'hidden',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                opacity: promo.isActive ? 1 : 0.78,
              }}
            >
              {/* Ticket Banner */}
              <div
                style={{
                  padding: 16,
                  background: promo.isActive
                    ? 'linear-gradient(135deg, #F47B20, #D95F16)'
                    : 'linear-gradient(135deg, #6b7280, #4b5563)',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, opacity: 0.9 }}>
                    <Tag size={13} /> PROMO CODE
                  </span>
                  <StatusBadge label={promo.isActive ? 'Active' : 'Paused'} tone={promo.isActive ? 'success' : 'neutral'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.06em' }}>
                    {promo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(promo.title)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>

              {/* Ticket Body */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
                  {promo.type}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--zr-text-secondary)' }}>
                  <Calendar size={14} />
                  <span>Valid: {promo.validity}</span>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px dashed var(--zr-border)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleToggle(promo)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--zr-border)',
                      background: promo.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.15)',
                      color: promo.isActive ? '#15803d' : 'var(--zr-text)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Power size={13} />
                    {promo.isActive ? 'Active (Pause)' : 'Paused (Activate)'}
                  </button>
                  <SecondaryButton onClick={() => setDeleteTarget(promo)}>
                    <Trash2 size={13} />
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Promo Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Restaurant Promo Code"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleCreate()}>Save Campaign</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Promo Code" placeholder="e.g., WEEKEND20" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Dropdown
            label="Discount Type"
            value={promoType}
            onChange={setPromoType}
            options={[
              { label: 'Percentage (%)', value: 'percent' },
              { label: 'Fixed Amount (PKR)', value: 'fixed' },
              { label: 'Free Delivery', value: 'free_delivery' },
            ]}
          />
          <InputField label="Discount Value (% or PKR)" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DatePicker label="Start Date" value={startDate} onChange={setStartDate} />
            <DatePicker label="End Date" value={endDate} onChange={setEndDate} />
          </div>
        </div>
      </Modal>

      {/* Delete Promo Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Promo Code?"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void confirmDelete()}>Delete Permanently</PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Are you sure you want to delete promo code <strong>{deleteTarget?.title}</strong>?
        </p>
      </Modal>
    </div>
  );
};
