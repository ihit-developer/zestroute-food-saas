import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Eye,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
} from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import {
  Dropdown,
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
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface IngredientRow {
  id: string;
  name: string;
  category?: string;
  unit: string;
  quantity: number;
  purchasePriceMinor: number;
  totalValueMinor?: number;
  supplierName: string;
  lowStockThreshold?: number;
  lowStock: boolean;
  imageUrl?: string;
  notes?: string;
  lastRestockedAt?: string;
}

const UNIT_OPTIONS = [
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Liters (l)', value: 'l' },
  { label: 'Milliliters (ml)', value: 'ml' },
  { label: 'Pieces (pcs)', value: 'pcs' },
];

const CATEGORY_OPTIONS = [
  { label: 'Meat & Poultry', value: 'Meat & Poultry' },
  { label: 'Fresh Produce', value: 'Fresh Produce' },
  { label: 'Dairy & Cheese', value: 'Dairy & Cheese' },
  { label: 'Spices & Sauces', value: 'Spices & Sauces' },
  { label: 'Bakery & Grains', value: 'Bakery & Grains' },
  { label: 'Beverages', value: 'Beverages' },
  { label: 'Packaging', value: 'Packaging' },
  { label: 'Kitchen Essentials', value: 'Kitchen Essentials' },
];

export const InventoryPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IngredientRow | null>(null);
  const [detailItem, setDetailItem] = useState<IngredientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IngredientRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Meat & Poultry');
  const [quantity, setQuantity] = useState('25');
  const [unit, setUnit] = useState('kg');
  const [pricePkr, setPricePkr] = useState('500');
  const [threshold, setThreshold] = useState('5');
  const [supplierName, setSupplierName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { data, refetch } = useRestaurantList<IngredientRow>('inventory');

  const invalidateInventory = async () => {
    await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'inventory'] });
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCategory('Meat & Poultry');
    setQuantity('25');
    setUnit('kg');
    setPricePkr('500');
    setThreshold('5');
    setSupplierName('');
    setImageUrl('');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (row: IngredientRow) => {
    setEditing(row);
    setName(row.name);
    setCategory(row.category || 'Kitchen Essentials');
    setQuantity(String(row.quantity));
    setUnit(row.unit || 'kg');
    setPricePkr(String(Math.round(row.purchasePriceMinor / 100)));
    setThreshold(String(row.lowStockThreshold ?? 5));
    setSupplierName(row.supplierName === '—' ? '' : row.supplierName);
    setImageUrl(row.imageUrl ?? '');
    setNotes(row.notes ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId) {
      showToast('Please sign in as a restaurant owner first', 'error');
      return;
    }
    if (!name.trim()) {
      showToast('Ingredient name is required', 'error');
      return;
    }
    const payload = {
      name: name.trim(),
      category,
      unit,
      quantity: Math.max(0, Number(quantity) || 0),
      purchasePriceMinor: Math.max(0, Math.round((Number(pricePkr) || 0) * 100)),
      lowStockThreshold: Math.max(0, Number(threshold) || 5),
      supplierName: supplierName.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing) {
        await restaurantHttpClient.patch(`/restaurant/${restaurantId}/inventory/${editing.id}`, payload);
        showToast('Ingredient updated in MongoDB!', 'success');
      } else {
        await restaurantHttpClient.post(`/restaurant/${restaurantId}/inventory`, payload);
        showToast('Ingredient added to inventory!', 'success');
      }
      await invalidateInventory();
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save ingredient', 'error');
    }
  };

  const handleAdjustStock = async (row: IngredientRow, delta: number) => {
    if (!restaurantId) return;
    const nextQty = Math.max(0, row.quantity + delta);
    setBusyId(row.id);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/inventory/${row.id}`, {
        quantity: nextQty,
      });
      await invalidateInventory();
      showToast(`${row.name}: ${nextQty} ${row.unit}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update stock', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!restaurantId || !deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/inventory/${deleteTarget.id}`);
      await invalidateInventory();
      showToast(`${deleteTarget.name} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete ingredient', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const lowCount = data.filter((d) => d.lowStock).length;
  const healthyCount = data.length - lowCount;
  const totalValueMinor = data.reduce(
    (sum, item) => sum + (item.totalValueMinor ?? item.quantity * item.purchasePriceMinor),
    0
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (tab === 'alerts' && !r.lowStock) return false;
      if (tab === 'healthy' && r.lowStock) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q)
      );
    });
  }, [data, tab, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Kitchen Inventory &amp; Stock</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Real-time ingredient photos, stock levels, supplier tracking, and instant restock controls.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SecondaryButton leftIcon={<RefreshCw size={15} />} onClick={() => void refetch()}>
            Refresh
          </SecondaryButton>
          <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>
            Add Ingredient
          </PrimaryButton>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Ingredients', val: String(data.length), color: 'var(--zr-text)' },
          { label: 'Total Stock Value', val: formatMoney(totalValueMinor), color: 'var(--zr-primary, #F47B20)' },
          { label: 'Healthy Stock', val: String(healthyCount), color: '#15803d' },
          { label: 'Low Stock Alerts', val: String(lowCount), color: lowCount > 0 ? '#b91c1c' : '#15803d' },
        ].map((kpi) => (
          <div key={kpi.label} className="zr-card" style={{ padding: 16, borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          items={[
            { key: 'all', label: `All Ingredients (${data.length})` },
            { key: 'healthy', label: `Healthy (${healthyCount})` },
            { key: 'alerts', label: `Low Stock Alerts (${lowCount})` },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
        <div style={{ minWidth: 220, flex: '0 1 340px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search ingredient, category, supplier..." />
        </div>
      </div>

      {/* Visual Food-Style Inventory Cards Grid */}
      {visibleItems.length === 0 ? (
        <EmptyState
          title={tab === 'alerts' ? 'No low stock alerts' : 'No inventory items yet'}
          description="Add kitchen ingredients with photos, unit prices, suppliers, and low-stock alert thresholds."
          actionLabel="Add First Ingredient"
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
          {visibleItems.map((item) => {
            const thresholdVal = Math.max(1, item.lowStockThreshold ?? 5);
            const fillPct = Math.min(100, Math.round((item.quantity / (thresholdVal * 4)) * 100));
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className="zr-card"
                style={{
                  overflow: 'hidden',
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Photo Banner */}
                <div style={{ position: 'relative', height: 150, background: 'var(--zr-bg-subtle, #f4efe9)' }}>
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
                      <Package size={28} />
                      <span style={{ fontSize: 12 }}>No Ingredient Photo</span>
                    </div>
                  )}

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
                      label={item.lowStock ? 'Low Stock' : 'Healthy'}
                      tone={item.lowStock ? 'warning' : 'success'}
                    />
                    <span
                      style={{
                        background: 'rgba(17,17,17,0.78)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(item.purchasePriceMinor)} / {item.unit}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--zr-primary, #F47B20)',
                      }}
                    >
                      {item.category || 'Kitchen Essentials'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Truck size={12} /> {item.supplierName}
                    </span>
                  </div>

                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{item.name}</h3>

                  {/* Stock Level Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--zr-text-secondary)' }}>In Stock</span>
                      <strong style={{ color: item.lowStock ? '#b91c1c' : 'var(--zr-text)' }}>
                        {item.quantity} {item.unit}
                      </strong>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: 'var(--zr-border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${fillPct}%`,
                          borderRadius: 999,
                          background: item.lowStock ? '#ef4444' : '#22c55e',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--zr-text-secondary)' }}>
                      <span>Alert below: {item.lowStockThreshold ?? 5} {item.unit}</span>
                      <span>Value: {formatMoney(item.totalValueMinor ?? item.quantity * item.purchasePriceMinor)}</span>
                    </div>
                  </div>

                  {/* Quick Stock + CRUD Actions */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '1px solid var(--zr-border)',
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <SecondaryButton disabled={isBusy} onClick={() => void handleAdjustStock(item, -1)}>
                      <Minus size={13} /> 1
                    </SecondaryButton>
                    <SecondaryButton disabled={isBusy} onClick={() => void handleAdjustStock(item, 10)}>
                      <Plus size={13} /> 10
                    </SecondaryButton>
                    <SecondaryButton onClick={() => setDetailItem(item)}>
                      <Eye size={13} /> Details
                    </SecondaryButton>
                    <SecondaryButton onClick={() => openEdit(item)}>
                      <Pencil size={13} />
                    </SecondaryButton>
                    <SecondaryButton onClick={() => setDeleteTarget(item)}>
                      <Trash2 size={13} />
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingredient Details Modal */}
      <Modal
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title={`Inventory Details · ${detailItem?.name ?? ''}`}
        footer={
          <>
            <SecondaryButton onClick={() => setDetailItem(null)}>Close</SecondaryButton>
            {detailItem ? (
              <PrimaryButton
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  openEdit(target);
                }}
              >
                Edit Ingredient
              </PrimaryButton>
            ) : null}
          </>
        }
      >
        {detailItem ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
            {detailItem.imageUrl ? (
              <img
                src={detailItem.imageUrl}
                alt={detailItem.name}
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12 }}
              />
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 17 }}>{detailItem.name}</strong>
              <StatusBadge
                label={detailItem.lowStock ? 'Low Stock Warning' : 'Healthy Stock'}
                tone={detailItem.lowStock ? 'warning' : 'success'}
              />
            </div>
            {detailItem.lowStock ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', fontSize: 12.5 }}>
                <AlertTriangle size={15} />
                <span>Stock is at or below threshold ({detailItem.lowStockThreshold ?? 5} {detailItem.unit}). Consider restocking soon.</span>
              </div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><strong>Category:</strong> {detailItem.category || 'Kitchen Essentials'}</div>
              <div><strong>Supplier:</strong> {detailItem.supplierName}</div>
              <div><strong>Current Stock:</strong> {detailItem.quantity} {detailItem.unit}</div>
              <div><strong>Alert Threshold:</strong> {detailItem.lowStockThreshold ?? 5} {detailItem.unit}</div>
              <div><strong>Unit Purchase Cost:</strong> {formatMoney(detailItem.purchasePriceMinor)}</div>
              <div><strong>Total Stock Value:</strong> {formatMoney(detailItem.totalValueMinor ?? detailItem.quantity * detailItem.purchasePriceMinor)}</div>
            </div>
            {detailItem.notes ? (
              <div><strong>Storage / Kitchen Notes:</strong> {detailItem.notes}</div>
            ) : null}
            {detailItem.lastRestockedAt ? (
              <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>
                Last Updated: {new Date(detailItem.lastRestockedAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Add / Edit Ingredient Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Ingredient: ${editing.name}` : 'Add Kitchen Ingredient'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSave()}>
              {editing ? 'Update Ingredient' : 'Save Ingredient'}
            </PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Ingredient Name" placeholder="e.g., Chicken Breast Fillet" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Dropdown label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
            <Dropdown label="Unit" value={unit} onChange={setUnit} options={UNIT_OPTIONS} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <InputField label="Stock Qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <InputField label="Low Alert Qty" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <InputField label="Unit Cost (PKR)" type="number" min={0} value={pricePkr} onChange={(e) => setPricePkr(e.target.value)} />
          </div>
          <InputField label="Supplier Name" placeholder="Fresh Farms Poultry" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <InputField label="Ingredient Image URL" placeholder="https://images.unsplash.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          {imageUrl.trim() ? (
            <img
              src={imageUrl.trim()}
              alt="Preview"
              style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 10 }}
            />
          ) : null}
          <InputField label="Storage / Kitchen Notes (optional)" placeholder="Keep refrigerated at 2–4°C" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Ingredient?"
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
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong> from kitchen inventory?
        </p>
      </Modal>
    </div>
  );
};
