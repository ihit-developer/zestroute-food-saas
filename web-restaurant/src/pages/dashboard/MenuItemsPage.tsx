import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil, Plus, Power, Trash2, UtensilsCrossed } from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../../components/ui';
import { foodItemSchema } from '../../features/validation/restaurantSchemas';
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface FoodRow {
  id: string;
  name: string;
  description?: string;
  categoryName: string;
  regularPriceMinor: number;
  discountPriceMinor?: number;
  prepTimeMins?: number;
  stockQuantity: number;
  isAvailable: boolean;
  imageUrl?: string;
}

export const MenuItemsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FoodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FoodRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const { data } = useRestaurantList<FoodRow>('foods');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(foodItemSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: 'default',
      regularPricePkr: 500,
      discountPricePkr: 0,
      prepTimeMins: 15,
      stockQuantity: 10,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setImageUrl('');
    reset({
      name: '',
      description: '',
      categoryId: 'default',
      regularPricePkr: 500,
      discountPricePkr: 0,
      prepTimeMins: 15,
      stockQuantity: 10,
    });
    setModalOpen(true);
  };

  const openEdit = (row: FoodRow) => {
    setEditing(row);
    setImageUrl(row.imageUrl ?? '');
    reset({
      name: row.name,
      description: row.description ?? '',
      categoryId: 'default',
      regularPricePkr: Math.round(row.regularPriceMinor / 100),
      discountPricePkr: row.discountPriceMinor ? Math.round(row.discountPriceMinor / 100) : 0,
      prepTimeMins: row.prepTimeMins ?? 15,
      stockQuantity: row.stockQuantity ?? 10,
    });
    setModalOpen(true);
  };

  const handleToggleAvailable = async (row: FoodRow) => {
    if (!restaurantId) return;
    setBusyId(row.id);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/foods/${row.id}`, {
        isAvailable: !row.isAvailable,
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'foods'] });
      showToast(
        `${row.name} is now ${!row.isAvailable ? 'Available' : 'Not Available'}`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update availability', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!restaurantId || !deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/foods/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'foods'] });
      showToast(`${deleteTarget.name} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete food item', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = data.filter((r) => {
    if (availFilter === 'available' && !r.isAvailable) return false;
    if (availFilter === 'unavailable' && r.isAvailable) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.categoryName.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    );
  });

  const availCount = data.filter((f) => f.isAvailable).length;
  const unavailCount = data.length - availCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Food Menu</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Manage dishes, photos, pricing, and real-time availability for customers.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>
          Add Food Dish
        </PrimaryButton>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          items={[
            { key: 'all', label: `All (${data.length})` },
            { key: 'available', label: `Available (${availCount})` },
            { key: 'unavailable', label: `Not Available (${unavailCount})` },
          ]}
          activeKey={availFilter}
          onChange={setAvailFilter}
        />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 340 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search dishes or categories..." />
        </div>
      </div>

      {/* Modern Food Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No food dishes found"
          description="Add appetizing dishes with photos, pricing, and availability controls."
          actionLabel="Add First Dish"
          onAction={openCreate}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className="zr-card"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 16,
                opacity: item.isAvailable ? 1 : 0.78,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Dish Photo Banner */}
              <div style={{ position: 'relative', height: 170, background: 'var(--zr-bg-subtle, #f4efe9)' }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: 'var(--zr-text-secondary)',
                    }}
                  >
                    <UtensilsCrossed size={28} />
                    <span style={{ fontSize: 12 }}>No Photo</span>
                  </div>
                )}

                {/* Top Badges Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    right: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <StatusBadge
                    label={item.isAvailable ? 'Available' : 'Not Available'}
                    tone={item.isAvailable ? 'success' : 'error'}
                  />
                  <span
                    style={{
                      background: 'rgba(17, 17, 17, 0.78)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {formatMoney(item.regularPriceMinor)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--zr-primary, #f47b20)',
                    }}
                  >
                    {item.categoryName}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--zr-text-secondary)',
                    }}
                  >
                    <Clock size={12} /> {item.prepTimeMins ?? 15} min
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{item.name}</h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13,
                      color: 'var(--zr-text-secondary)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description || 'Freshly prepared to order with quality ingredients.'}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid var(--zr-border)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleToggleAvailable(item)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--zr-border)',
                      background: item.isAvailable ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: item.isAvailable ? '#15803d' : '#b91c1c',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Power size={13} />
                    {item.isAvailable ? 'Available' : 'Not Available'}
                  </button>
                  <SecondaryButton onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setDeleteTarget(item)}>
                    <Trash2 size={14} />
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Dish: ${editing.name}` : 'Add New Food Dish'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={handleSubmit(async (values) => {
                if (!restaurantId) {
                  showToast('Please sign in as a restaurant owner first', 'error');
                  return;
                }
                const payload = {
                  name: values.name,
                  description: values.description,
                  regularPriceMinor: Math.round(values.regularPricePkr * 100),
                  discountPriceMinor: values.discountPricePkr
                    ? Math.round(values.discountPricePkr * 100)
                    : undefined,
                  prepTimeMins: values.prepTimeMins,
                  isAvailable: editing ? editing.isAvailable : true,
                  imageUrl: imageUrl.trim() || undefined,
                };
                try {
                  if (editing) {
                    await restaurantHttpClient.patch(`/restaurant/${restaurantId}/foods/${editing.id}`, payload);
                    showToast('Dish updated!', 'success');
                  } else {
                    await restaurantHttpClient.post(`/restaurant/${restaurantId}/foods`, payload);
                    showToast('Dish added to menu!', 'success');
                  }
                  await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'foods'] });
                  setModalOpen(false);
                  setEditing(null);
                  setImageUrl('');
                  reset();
                } catch (err) {
                  showToast(err instanceof ApiClientError ? err.message : 'Failed to save dish', 'error');
                }
              })}
            >
              {editing ? 'Update Dish' : 'Save Dish'}
            </PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <InputField label="Food Name" placeholder="e.g., Zinger Crunch Burger" error={errors.name?.message} {...field} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <InputField label="Description & Ingredients" placeholder="Crispy fillet, cheddar, house sauce" error={errors.description?.message} {...field} />
            )}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Controller
              control={control}
              name="regularPricePkr"
              render={({ field }) => (
                <InputField
                  label="Price (PKR)"
                  type="number"
                  error={errors.regularPricePkr?.message}
                  value={String(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
            <Controller
              control={control}
              name="prepTimeMins"
              render={({ field }) => (
                <InputField
                  label="Prep Time (mins)"
                  type="number"
                  error={errors.prepTimeMins?.message}
                  value={String(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>
          <InputField
            label="Food Image URL"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl.trim() ? (
            <img
              src={imageUrl.trim()}
              alt="Preview"
              style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 12 }}
            />
          ) : null}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Food Item?"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void confirmDelete()}>
              {busyId ? 'Deleting...' : 'Delete Permanently'}
            </PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from your restaurant menu?
        </p>
      </Modal>
    </div>
  );
};
