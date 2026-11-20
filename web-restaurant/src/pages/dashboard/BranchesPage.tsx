import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Clock, MapPin, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
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

interface BranchRow {
  id: string;
  name: string;
  cityArea: string;
  street?: string;
  hours: string;
  isActive: boolean;
}

export const BranchesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchRow | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('');
  const [street, setStreet] = useState('');
  const [lat, setLat] = useState('31.4697');
  const [lng, setLng] = useState('74.4126');
  const { data } = useRestaurantList<BranchRow>('branches');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCity('Lahore');
    setArea('');
    setStreet('');
    setModalOpen(true);
  };

  const openEdit = (row: BranchRow) => {
    setEditing(row);
    setName(row.name);
    const [c = 'Lahore', a = ''] = row.cityArea.split(',').map((s) => s.trim());
    setCity(c);
    setArea(a);
    setStreet(row.street ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !name.trim()) {
      showToast('Branch name is required', 'error');
      return;
    }
    const payload = {
      name: name.trim(),
      city: city.trim() || 'Lahore',
      area: area.trim() || 'Main',
      street: street.trim() || 'Main Boulevard',
      latitude: Number(lat) || 31.5204,
      longitude: Number(lng) || 74.3587,
    };
    try {
      if (editing) {
        await restaurantHttpClient.patch(`/restaurant/${restaurantId}/branches/${editing.id}`, payload);
        showToast('Branch updated!', 'success');
      } else {
        await restaurantHttpClient.post(`/restaurant/${restaurantId}/branches`, payload);
        showToast('Branch added to MongoDB!', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'branches'] });
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save branch', 'error');
    }
  };

  const handleToggle = async (r: BranchRow) => {
    if (!restaurantId) return;
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/branches/${r.id}`, {
        isActive: !r.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'branches'] });
      showToast(`${r.name} marked ${!r.isActive ? 'Open' : 'Closed'}`, 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update branch', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!restaurantId || !deleteTarget) return;
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/branches/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'branches'] });
      showToast(`${deleteTarget.name} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to delete branch', 'error');
    }
  };

  const openCount = data.filter((b) => b.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Restaurant Branches</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Manage locations, delivery zones, and real-time Open / Closed kitchen status.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>
          Add New Branch
        </PrimaryButton>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Branches', val: String(data.length), color: 'var(--zr-text)' },
          { label: 'Open & Accepting', val: String(openCount), color: '#15803d' },
          { label: 'Temporarily Closed', val: String(data.length - openCount), color: '#b91c1c' },
        ].map((kpi) => (
          <div key={kpi.label} className="zr-card" style={{ padding: 16, borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Modern Branch Cards Grid */}
      {data.length === 0 ? (
        <EmptyState
          title="No branches added yet"
          description="Add your restaurant locations so customer orders route to the nearest kitchen."
          actionLabel="Add First Branch"
          onAction={openCreate}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {data.map((branch) => (
            <div
              key={branch.id}
              className="zr-card"
              style={{
                overflow: 'hidden',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Accent Header */}
              <div
                style={{
                  padding: '14px 18px',
                  background: branch.isActive
                    ? 'linear-gradient(135deg, rgba(244,123,32,0.14), rgba(244,123,32,0.04))'
                    : 'rgba(156,163,175,0.14)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--zr-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: branch.isActive ? 'var(--zr-primary, #F47B20)' : '#6b7280',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <strong style={{ fontSize: 16 }}>{branch.name}</strong>
                </div>
                <StatusBadge label={branch.isActive ? 'Open' : 'Closed'} tone={branch.isActive ? 'success' : 'error'} />
              </div>

              {/* Body */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                  <MapPin size={15} color="#F47B20" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{branch.cityArea}</div>
                    {branch.street ? (
                      <div style={{ color: 'var(--zr-text-secondary)', fontSize: 12.5 }}>{branch.street}</div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--zr-text-secondary)' }}>
                  <Clock size={14} />
                  <span>{branch.hours}</span>
                </div>

                {/* Footer Controls */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid var(--zr-border)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleToggle(branch)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--zr-border)',
                      background: branch.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: branch.isActive ? '#15803d' : '#b91c1c',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Power size={13} />
                    {branch.isActive ? 'Open (Click to Close)' : 'Closed (Click to Open)'}
                  </button>
                  <SecondaryButton onClick={() => openEdit(branch)}>
                    <Pencil size={13} />
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setDeleteTarget(branch)}>
                    <Trash2 size={13} />
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Branch Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Branch: ${editing.name}` : 'Add Restaurant Branch'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSave()}>{editing ? 'Update Branch' : 'Save Branch'}</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Branch Name" placeholder="e.g., DHA Phase 5 Branch" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="City" placeholder="Lahore" value={city} onChange={(e) => setCity(e.target.value)} />
            <InputField label="Area" placeholder="DHA Phase 5" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <InputField label="Street Address" placeholder="Commercial Sector C" value={street} onChange={(e) => setStreet(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
            <InputField label="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Delete Branch Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Branch?"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void confirmDelete()}>Delete Permanently</PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Are you sure you want to remove branch <strong>{deleteTarget?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
};
