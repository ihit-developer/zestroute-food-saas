import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  DataTable,
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui/AdminUI';
import { useAdminList } from '../hooks/useAdminData';
import { adminHttpClient } from '../services/apiClient';

interface GlobalOrderRow {
  id: string;
  orderNumber: string;
  restaurant: string;
  customer?: string;
  rider: string;
  paymentMethod?: string;
  totalMinor: number;
  status: string;
  createdAt?: string;
}
interface GlobalCategoryRow { id: string; name: string; sortOrder: number; isActive: boolean }

export const GlobalOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const { data } = useAdminList<GlobalOrderRow>('orders');

  const handleOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminHttpClient.patch(`/admin/orders/${orderId}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`Order updated to ${status.replace(/_/g, ' ')}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to update order');
    }
  };

  const handleDeleteOrder = async (r: GlobalOrderRow) => {
    if (!window.confirm(`Delete order ${r.orderNumber}?`)) return;
    try {
      await adminHttpClient.del(`/admin/orders/${r.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`${r.orderNumber} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Unable to delete order');
    }
  };

  const filtered = data.filter((r) => {
    if (statusTab !== 'all' && r.status !== statusTab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.orderNumber.toLowerCase().includes(q) ||
      r.restaurant.toLowerCase().includes(q) ||
      (r.customer ?? '').toLowerCase().includes(q)
    );
  });

  const totalVolumeMinor = data
    .filter((o) => !['cancelled', 'rejected'].includes(o.status))
    .reduce((sum, o) => sum + o.totalMinor, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Global Order Management</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Real-time orders across Pizza Box, Cheezious, and all partner kitchens
          </span>
        </div>
        <div className="zr-search-slot">
          <SearchBar value={search} onChange={setSearch} placeholder="Search Order #, Restaurant, Customer..." />
        </div>
      </div>

      <div className="zr-stat-strip">
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Total Orders</span>
          <strong style={{ fontSize: 22 }}>{data.length}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Active / Pending</span>
          <strong style={{ fontSize: 22, color: '#EA580C' }}>
            {data.filter((o) => !['delivered', 'cancelled', 'rejected', 'refunded'].includes(o.status)).length}
          </strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Delivered</span>
          <strong style={{ fontSize: 22, color: '#16A34A' }}>
            {data.filter((o) => o.status === 'delivered').length}
          </strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Order Volume</span>
          <strong style={{ fontSize: 22 }}>{formatMoney(totalVolumeMinor)}</strong>
        </div>
      </div>

      <Tabs
        items={[
          { key: 'all', label: `All (${data.length})` },
          { key: 'pending', label: 'Pending' },
          { key: 'preparing', label: 'Preparing' },
          { key: 'on_the_way', label: 'In Transit' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'cancelled', label: 'Cancelled' },
        ]}
        activeKey={statusTab}
        onChange={setStatusTab}
      />
      <DataTable
        columns={[
          { key: 'num', header: 'Order #', render: (r) => <strong>{r.orderNumber}</strong> },
          { key: 'rest', header: 'Restaurant', render: (r) => <strong>{r.restaurant}</strong> },
          { key: 'cust', header: 'Customer', render: (r) => r.customer || '—' },
          {
            key: 'ownerStage',
            header: 'Current Stage',
            render: (r) => {
              const isKitchen = ['pending', 'confirmed', 'preparing'].includes(r.status);
              const isRider = ['ready_for_pickup', 'rider_assigned', 'picked_up', 'on_the_way'].includes(r.status);
              const label = isKitchen ? 'Kitchen' : isRider ? 'Rider Delivery' : r.status === 'delivered' ? 'Completed' : 'Closed';
              const tone = isKitchen ? 'warning' : isRider ? 'info' : r.status === 'delivered' ? 'success' : 'error';
              return <StatusBadge label={label} tone={tone} />;
            },
          },
          { key: 'rider', header: 'Rider', render: (r) => r.rider },
          { key: 'pay', header: 'Payment', render: (r) => (r.paymentMethod ?? 'cod').toUpperCase() },
          { key: 'total', header: 'Total', render: (r) => <strong>{formatMoney(r.totalMinor)}</strong> },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge
                label={r.status.replace(/_/g, ' ')}
                tone={
                  r.status === 'delivered'
                    ? 'success'
                    : ['cancelled', 'rejected', 'refunded'].includes(r.status)
                      ? 'error'
                      : r.status === 'pending'
                        ? 'warning'
                        : 'info'
                }
              />
            ),
          },
          {
            key: 'date',
            header: 'Date',
            render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  aria-label="Update order status"
                  value={r.status}
                  onChange={(e) => void handleOrderStatus(r.id, e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--zr-border)',
                    background: 'var(--zr-surface)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned', 'on_the_way', 'delivered', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <SecondaryButton leftIcon={<Trash2 size={13} />} onClick={() => void handleDeleteOrder(r)}>
                  Delete
                </SecondaryButton>
              </div>
            ),
          },
        ]}
        data={filtered}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No platform orders found" description="Monitor all orders across restaurants here." />}
      />
    </div>
  );
};

export const GlobalCategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalCategoryRow | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const { data } = useAdminList<GlobalCategoryRow>('categories');

  const openCreate = () => {
    setEditing(null);
    setNameEn('');
    setNameUr('');
    setSortOrder(String(data.length + 1));
    setModalOpen(true);
  };

  const openEdit = (row: GlobalCategoryRow) => {
    setEditing(row);
    setNameEn(row.name);
    setNameUr('');
    setSortOrder(String(row.sortOrder));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!nameEn.trim()) {
      showToast('Category name is required');
      return;
    }
    try {
      if (editing) {
        await adminHttpClient.patch(`/admin/categories/${editing.id}`, {
          name: nameEn.trim(),
          nameUr: nameUr.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
        });
        showToast('Global category updated!');
      } else {
        const slug = nameEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await adminHttpClient.post('/admin/categories', {
          name: nameEn.trim(),
          nameUr: nameUr.trim() || undefined,
          slug,
          sortOrder: Number(sortOrder) || data.length + 1,
        });
        showToast('Global category saved to MongoDB!');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setModalOpen(false);
      setEditing(null);
      setNameEn('');
      setNameUr('');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save category');
    }
  };

  const handleToggleActive = async (row: GlobalCategoryRow) => {
    try {
      await adminHttpClient.patch(`/admin/categories/${row.id}`, { isActive: !row.isActive });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      showToast(`${row.name} marked ${!row.isActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update category');
    }
  };

  const handleDelete = async (row: GlobalCategoryRow) => {
    try {
      await adminHttpClient.del(`/admin/categories/${row.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      showToast(`${row.name} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Global Food Categories</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Platform-wide discovery categories (Create, Edit, Toggle, Delete).
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>Add Global Category</PrimaryButton>
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Category', render: (r) => <strong>{r.name}</strong> },
          { key: 'sort', header: 'Order', render: (r) => r.sortOrder },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'success' : 'neutral'} /> },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SecondaryButton onClick={() => openEdit(r)}><Pencil size={13} /> Edit</SecondaryButton>
                <SecondaryButton onClick={() => void handleToggleActive(r)}>{r.isActive ? 'Disable' : 'Enable'}</SecondaryButton>
                <SecondaryButton onClick={() => void handleDelete(r)}><Trash2 size={13} /></SecondaryButton>
              </div>
            ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No global categories yet" description="Seeded reference categories and admin-managed categories appear here." actionLabel="Create Category" onAction={openCreate} />}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Category: ${editing.name}` : 'Add Global Category'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSave()}>{editing ? 'Update' : 'Save'}</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Category Name (English)" placeholder="e.g., Biryani" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          <InputField label="Category Name (Urdu)" placeholder="بریانی" value={nameUr} onChange={(e) => setNameUr(e.target.value)} />
          <InputField label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
