import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
  DataTable,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { categorySchema } from '../../features/validation/restaurantSchemas';
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface CategoryRow {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export const MenuCategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const { data } = useRestaurantList<CategoryRow>('categories');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; sortOrder: number }>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', sortOrder: 0 },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', sortOrder: data.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    reset({ name: row.name, sortOrder: row.sortOrder });
    setModalOpen(true);
  };

  const onSave = async (values: { name: string; sortOrder: number }) => {
    if (!restaurantId) {
      showToast('Please sign in as a restaurant owner first', 'error');
      return;
    }
    try {
      if (editing) {
        await restaurantHttpClient.patch(`/restaurant/${restaurantId}/categories/${editing.id}`, values);
        showToast('Category updated!', 'success');
      } else {
        await restaurantHttpClient.post(`/restaurant/${restaurantId}/categories`, values);
        showToast('Menu category saved to MongoDB!', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'categories'] });
      setModalOpen(false);
      setEditing(null);
      reset();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save category', 'error');
    }
  };

  const handleToggle = async (row: CategoryRow) => {
    if (!restaurantId) return;
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/categories/${row.id}`, {
        isActive: !row.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'categories'] });
      showToast(`${row.name} marked ${!row.isActive ? 'Active' : 'Inactive'}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update category', 'error');
    }
  };

  const handleDelete = async (row: CategoryRow) => {
    if (!restaurantId) return;
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/categories/${row.id}`);
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'categories'] });
      showToast(`${row.name} deleted`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete category', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Menu Categories</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Create, edit, reorder, enable/disable, or delete your restaurant menu categories.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>
          Add Category
        </PrimaryButton>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Category Name', render: (r) => <strong>{r.name}</strong> },
          { key: 'sort', header: 'Sort Order', render: (r) => r.sortOrder },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge label={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'success' : 'neutral'} />
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SecondaryButton onClick={() => openEdit(r)}><Pencil size={13} /> Edit</SecondaryButton>
                <SecondaryButton onClick={() => void handleToggle(r)}>{r.isActive ? 'Disable' : 'Enable'}</SecondaryButton>
                <SecondaryButton onClick={() => void handleDelete(r)}><Trash2 size={13} /></SecondaryButton>
              </div>
            ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No menu categories yet"
            description="Create categories such as Special Burgers, BBQ Specials, or Drinks to structure your menu."
            actionLabel="Create First Category"
            onAction={openCreate}
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Category: ${editing.name}` : 'Add Menu Category'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSubmit(onSave)}>{editing ? 'Update Category' : 'Save Category'}</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <InputField label="Category Name" placeholder="e.g., BBQ Specials" error={errors.name?.message} {...field} />
            )}
          />
          <Controller
            control={control}
            name="sortOrder"
            render={({ field }) => (
              <InputField
                label="Sort Order"
                type="number"
                error={errors.sortOrder?.message}
                value={String(field.value)}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </div>
      </Modal>
    </div>
  );
};
