import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Info, KeyRound, Mail, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
  EmptyState,
  InputField,
  Modal,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { staffSchema } from '../../features/validation/restaurantSchemas';
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

const PERMISSION_SCOPES = [
  { key: 'orders', label: 'Orders' },
  { key: 'menu', label: 'Food Menu' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'reports', label: 'Finance & Reports' },
  { key: 'branches', label: 'Branches' },
] as const;

interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  title: string;
  permissions: string[];
}

export const StaffPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [password, setPassword] = useState('StaffPass#2026!');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['orders']);
  const { data } = useRestaurantList<StaffRow>('staff');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ fullName: string; email: string; title: string }>({
    resolver: zodResolver(staffSchema),
    defaultValues: { fullName: '', email: '', title: '' },
  });

  const togglePerm = (key: string) =>
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );

  const openCreate = () => {
    setEditing(null);
    reset({ fullName: '', email: '', title: '' });
    setPassword('StaffPass#2026!');
    setSelectedPerms(['orders', 'menu']);
    setModalOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    reset({ fullName: row.fullName, email: row.email, title: row.title });
    setSelectedPerms(row.permissions.length > 0 ? row.permissions : ['orders']);
    setModalOpen(true);
  };

  const onSave = async (values: { fullName: string; email: string; title: string }) => {
    if (!restaurantId) {
      showToast('Please sign in as a restaurant owner first', 'error');
      return;
    }
    if (selectedPerms.length === 0) {
      showToast('Select at least one permission scope', 'error');
      return;
    }
    try {
      if (editing) {
        await restaurantHttpClient.patch(`/restaurant/${restaurantId}/staff/${editing.id}`, {
          title: values.title,
          permissions: selectedPerms,
        });
        showToast('Staff permissions updated!', 'success');
      } else {
        if (password.trim().length < 8) {
          showToast('Login password must be at least 8 characters', 'error');
          return;
        }
        await restaurantHttpClient.post(`/restaurant/${restaurantId}/staff`, {
          fullName: values.fullName,
          email: values.email,
          password: password.trim(),
          title: values.title,
          permissions: selectedPerms,
        });
        showToast(`Staff account created! They can now sign in with ${values.email}`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'staff'] });
      setModalOpen(false);
      setEditing(null);
      reset();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save staff account', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!restaurantId || !deleteTarget) return;
    try {
      await restaurantHttpClient.del(`/restaurant/${restaurantId}/staff/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'staff'] });
      showToast(`${deleteTarget.fullName} removed from team`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to remove staff', 'error');
    }
  };

  const filtered = data.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Restaurant Staff &amp; Access Control</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Create staff logins with role-based permissions for Orders, Menu, Inventory, Finance, or Branches.
          </p>
        </div>
        <PrimaryButton leftIcon={<Plus size={16} />} onClick={openCreate}>
          Add Staff Member
        </PrimaryButton>
      </div>

      {/* How Staff Sign In Info Box */}
      <div
        className="zr-card"
        style={{
          padding: 14,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(244, 123, 32, 0.08)',
          borderColor: 'rgba(244, 123, 32, 0.35)',
        }}
      >
        <Info size={18} color="#F47B20" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <strong>How Staff Log In:</strong> Once you add a staff member with an email &amp; password, they can sign in directly at the{' '}
          <strong>Restaurant Portal Login</strong> using those credentials and manage only the modules you grant below.
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Staff', val: String(data.length) },
          { label: 'Order Access', val: String(data.filter((s) => s.permissions.includes('orders')).length) },
          { label: 'Menu Access', val: String(data.filter((s) => s.permissions.includes('menu')).length) },
          { label: 'Inventory Access', val: String(data.filter((s) => s.permissions.includes('inventory')).length) },
        ].map((kpi) => (
          <div key={kpi.label} className="zr-card" style={{ padding: 16, borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--zr-text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ maxWidth: 360 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search staff by name, role, or email..." />
      </div>

      {/* Modern Staff Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No staff members yet"
          description="Add kitchen managers, cashiers, or branch supervisors with dedicated login credentials."
          actionLabel="Add First Staff Member"
          onAction={openCreate}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((member) => {
            const initials = member.fullName
              .split(' ')
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={member.id}
                className="zr-card"
                style={{ padding: 18, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #F47B20, #D95F16)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.fullName}
                      </strong>
                      <StatusBadge label="Active" tone="success" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--zr-primary, #F47B20)' }}>
                      {member.title}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--zr-text-secondary)' }}>
                  <Mail size={14} />
                  <span>{member.email}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--zr-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={13} /> Granted Permissions
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {member.permissions.map((p) => (
                      <StatusBadge key={p} label={p.toUpperCase()} tone="info" />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid var(--zr-border)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <SecondaryButton onClick={() => openEdit(member)}>
                    <Pencil size={13} /> Edit Role
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setDeleteTarget(member)}>
                    <Trash2 size={13} /> Remove
                  </SecondaryButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Staff: ${editing.fullName}` : 'Add New Staff Account'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSubmit(onSave)}>
              {editing ? 'Save Permissions' : 'Create Staff Login'}
            </PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <InputField label="Full Name" placeholder="e.g., Bilal Tariq" disabled={Boolean(editing)} error={errors.fullName?.message} {...field} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <InputField label="Login Email" placeholder="staff@restaurant.com" disabled={Boolean(editing)} error={errors.email?.message} {...field} />
            )}
          />
          {!editing ? (
            <InputField
              label="Initial Login Password (min 8 chars)"
              placeholder="StaffPass#2026!"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : null}
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <InputField label="Job Title" placeholder="Kitchen Manager / Cashier" error={errors.title?.message} {...field} />
            )}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={13} /> Permission Scopes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PERMISSION_SCOPES.map((scope) => {
                const active = selectedPerms.includes(scope.key);
                return (
                  <button
                    key={scope.key}
                    type="button"
                    onClick={() => togglePerm(scope.key)}
                    style={{
                      padding: '7px 13px',
                      borderRadius: 999,
                      border: '1px solid var(--zr-border)',
                      background: active ? 'var(--zr-primary, #F47B20)' : 'transparent',
                      color: active ? '#fff' : 'var(--zr-text)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Staff Member?"
        footer={
          <>
            <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void confirmDelete()}>Remove Access</PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Remove <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email}) from your restaurant team?
        </p>
      </Modal>
    </div>
  );
};
