import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import {
  DataTable,
  EmptyState,
  ErrorState,
  InputField,
  LoadingSkeleton,
  Modal,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
  useToast,
} from '../components/ui/AdminUI';
import { useAdminList } from '../hooks/useAdminData';
import { adminHttpClient } from '../services/apiClient';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  isOnline?: boolean;
  status: string;
}

interface RestaurantRow {
  id: string;
  name: string;
  ownerName?: string;
  ownerEmail?: string;
  city: string;
  commissionPct?: number;
  ratingAvg?: number;
  status: string;
  submittedAt: string;
}

interface AppRow {
  id: string;
  name: string;
  ownerName?: string;
  ownerEmail?: string;
  city: string;
  status: string;
  submittedAt: string;
}

export const CustomersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editCust, setEditCust] = useState<UserRow | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const { data, isLoading, isError, refetch } = useAdminList<UserRow>('customers');

  const toggleStatus = async (r: UserRow) => {
    const next = r.status === 'suspended' ? 'active' : 'suspended';
    try {
      await adminHttpClient.patch(`/admin/customers/${r.id}/status`, { accountStatus: next });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      showToast(`${r.fullName} marked ${next}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update customer');
    }
  };

  const handleSaveCustomer = async () => {
    if (!editCust || !custName.trim()) return;
    try {
      await adminHttpClient.patch(`/admin/customers/${editCust.id}`, {
        fullName: custName.trim(),
        phone: custPhone.trim(),
      });
      setEditCust(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      showToast('Customer updated');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  };

  const handleDeleteCustomer = async (r: UserRow) => {
    if (!window.confirm(`Delete customer "${r.fullName}"?`)) return;
    try {
      await adminHttpClient.del(`/admin/customers/${r.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      showToast(`${r.fullName} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  };

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    );
  });

  const activeCount = data.filter((r) => r.status !== 'suspended').length;
  const suspendedCount = data.length - activeCount;

  if (isLoading) return <LoadingSkeleton height={220} />;
  if (isError) return <ErrorState message="Failed to load customers." onRetry={() => void refetch()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Customer Directory</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Manage registered customer accounts and platform access
          </span>
        </div>
        <div className="zr-search-slot">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone..." />
        </div>
      </div>

      <div className="zr-stat-strip">
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Total Customers</span>
          <strong style={{ fontSize: 22 }}>{data.length}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Active Accounts</span>
          <strong style={{ fontSize: 22, color: '#16A34A' }}>{activeCount}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Suspended</span>
          <strong style={{ fontSize: 22, color: '#DC2626' }}>{suspendedCount}</strong>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Customer', render: (r) => <strong>{r.fullName}</strong> },
          { key: 'email', header: 'Email', render: (r) => r.email || '—' },
          { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge label={r.status} tone={r.status === 'suspended' ? 'error' : 'success'} />
            ),
          },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SecondaryButton
                  leftIcon={<Pencil size={13} />}
                  onClick={() => {
                    setEditCust(r);
                    setCustName(r.fullName);
                    setCustPhone(r.phone);
                  }}
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton onClick={() => void toggleStatus(r)}>
                  {r.status === 'suspended' ? 'Activate' : 'Suspend'}
                </SecondaryButton>
                <SecondaryButton leftIcon={<Trash2 size={13} />} onClick={() => void handleDeleteCustomer(r)}>
                  Delete
                </SecondaryButton>
              </div>
            ),
          },
        ]}
        data={filtered}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No customers found" description="Registered customer accounts appear here." />}
      />
      <Modal
        open={Boolean(editCust)}
        title={`Edit Customer: ${editCust?.fullName ?? ''}`}
        onClose={() => setEditCust(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setEditCust(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSaveCustomer()}>Save</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Full Name *" value={custName} onChange={(e) => setCustName(e.target.value)} />
          <InputField label="Phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export const RestaurantsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editRest, setEditRest] = useState<RestaurantRow | null>(null);
  const [restName, setRestName] = useState('');
  const [restCommPct, setRestCommPct] = useState('15');
  const { data, isLoading, isError, refetch } = useAdminList<RestaurantRow>('restaurants');

  const review = async (r: RestaurantRow, status: 'approved' | 'suspended') => {
    try {
      await adminHttpClient.patch(`/admin/restaurants/${r.id}/review`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`${r.name} marked ${status}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update restaurant');
    }
  };

  const handleSaveRest = async () => {
    if (!editRest || !restName.trim()) return;
    try {
      await adminHttpClient.patch(`/admin/restaurants/${editRest.id}`, {
        name: restName.trim(),
        commissionBps: Math.round(Number(restCommPct) * 100),
      });
      setEditRest(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      showToast('Restaurant updated');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  };

  const handleDeleteRest = async (r: RestaurantRow) => {
    if (!window.confirm(`Delete restaurant "${r.name}"? This cannot be undone.`)) return;
    try {
      await adminHttpClient.del(`/admin/restaurants/${r.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`${r.name} deleted`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  };

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      (r.ownerName ?? '').toLowerCase().includes(q)
    );
  });

  const approvedCount = data.filter((r) => r.status === 'approved').length;
  const suspendedCount = data.filter((r) => r.status === 'suspended').length;

  if (isLoading) return <LoadingSkeleton height={220} />;
  if (isError) return <ErrorState message="Failed to load restaurants." onRetry={() => void refetch()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Partner Restaurants</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Live SaaS kitchens active on the Dastarkhwan marketplace
          </span>
        </div>
        <div className="zr-search-slot">
          <SearchBar value={search} onChange={setSearch} placeholder="Search restaurants or cuisines..." />
        </div>
      </div>

      <div className="zr-stat-strip">
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Total Partner Kitchens</span>
          <strong style={{ fontSize: 22 }}>{data.length}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Live &amp; Approved</span>
          <strong style={{ fontSize: 22, color: '#16A34A' }}>{approvedCount}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Suspended</span>
          <strong style={{ fontSize: 22, color: '#DC2626' }}>{suspendedCount}</strong>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Restaurant',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 800 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.city}</div>
              </div>
            ),
          },
          {
            key: 'owner',
            header: 'Partner Owner',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.ownerName || 'Partner'}</div>
                <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.ownerEmail || '—'}</div>
              </div>
            ),
          },
          {
            key: 'rating',
            header: 'Rating',
            render: (r) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                <Star size={14} color="#F59E0B" fill="#F59E0B" /> {(r.ratingAvg ?? 0).toFixed(1)}
              </span>
            ),
          },
          {
            key: 'comm',
            header: 'Commission',
            render: (r) => <strong>{r.commissionPct ?? 15}%</strong>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge label={r.status} tone={r.status === 'approved' ? 'success' : 'error'} />
            ),
          },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SecondaryButton
                  leftIcon={<Pencil size={13} />}
                  onClick={() => {
                    setEditRest(r);
                    setRestName(r.name);
                    setRestCommPct(String(r.commissionPct ?? 15));
                  }}
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton onClick={() => void review(r, r.status === 'suspended' ? 'approved' : 'suspended')}>
                  {r.status === 'suspended' ? 'Restore' : 'Suspend'}
                </SecondaryButton>
                <SecondaryButton leftIcon={<Trash2 size={13} />} onClick={() => void handleDeleteRest(r)}>
                  Delete
                </SecondaryButton>
              </div>
            ),
          },
        ]}
        data={filtered}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No partner restaurants yet"
            description="Approved and suspended restaurants appear here."
          />
        }
      />
      <Modal
        open={Boolean(editRest)}
        title={`Edit Restaurant: ${editRest?.name ?? ''}`}
        onClose={() => setEditRest(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setEditRest(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => void handleSaveRest()}>Save</PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Restaurant Name *" value={restName} onChange={(e) => setRestName(e.target.value)} />
          <InputField label="Commission (%)" type="number" value={restCommPct} onChange={(e) => setRestCommPct(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export const RestaurantApplicationsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [reviewItem, setReviewItem] = useState<AppRow | null>(null);
  const { data, isLoading, isError, refetch } = useAdminList<AppRow>('restaurant-applications');

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!reviewItem) return;
    try {
      await adminHttpClient.patch(`/admin/restaurants/${reviewItem.id}/review`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`Restaurant ${status} (audited)`);
      setReviewItem(null);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update application');
    }
  };

  if (isLoading) return <LoadingSkeleton height={220} />;
  if (isError) return <ErrorState message="Failed to load applications." onRetry={() => void refetch()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Restaurant Applications</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Verify new partner registrations before going live on the customer app
          </span>
        </div>
        <StatusBadge label={`${data.length} applications`} tone={data.length > 0 ? 'warning' : 'success'} />
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Restaurant', render: (r) => <strong>{r.name}</strong> },
          { key: 'owner', header: 'Applicant', render: (r) => r.ownerName || r.ownerEmail || '—' },
          { key: 'city', header: 'Cuisines', render: (r) => r.city },
          {
            key: 'submitted',
            header: 'Submitted',
            render: (r) => new Date(r.submittedAt).toLocaleDateString(),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusBadge label={r.status} tone={r.status === 'rejected' ? 'error' : 'warning'} />
            ),
          },
          {
            key: 'act',
            header: 'Review',
            render: (r) => <PrimaryButton onClick={() => setReviewItem(r)}>Review Docs</PrimaryButton>,
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="All caught up — no pending restaurant applications"
            description="When a new restaurant registers on the Partner Portal, it will appear here for approval."
          />
        }
      />

      <Modal
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        title={`Review Application: ${reviewItem?.name ?? ''}`}
        footer={
          <>
            <SecondaryButton onClick={() => void handleDecision('rejected')}>Reject</SecondaryButton>
            <PrimaryButton onClick={() => void handleDecision('approved')}>Approve Restaurant</PrimaryButton>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)', lineHeight: 1.6 }}>
          Approve or reject <strong>{reviewItem?.name}</strong> ({reviewItem?.city}). Approving immediately publishes
          this restaurant to the Dastarkhwan customer app and records an immutable audit log entry.
        </p>
      </Modal>
    </div>
  );
};

export const RidersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useAdminList<UserRow>('riders');

  const review = async (r: UserRow, status: 'approved' | 'suspended') => {
    try {
      await adminHttpClient.patch(`/admin/riders/${r.id}/review`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`Rider ${r.fullName} marked ${status}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update rider');
    }
  };

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.fullName.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
  });

  if (isLoading) return <LoadingSkeleton height={220} />;
  if (isError) return <ErrorState message="Failed to load riders." onRetry={() => void refetch()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Delivery Riders Fleet</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Monitor approved riders, online duty status, and vehicle types
          </span>
        </div>
        <div style={{ width: 300 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search riders..." />
        </div>
      </div>

      <div className="zr-stat-strip">
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Total Riders</span>
          <strong style={{ fontSize: 22 }}>{data.length}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Online Right Now</span>
          <strong style={{ fontSize: 22, color: '#16A34A' }}>{data.filter((r) => r.isOnline).length}</strong>
        </div>
        <div className="zr-kpi-card">
          <span style={{ fontSize: 12, color: 'var(--zr-text-secondary)', fontWeight: 700 }}>Suspended</span>
          <strong style={{ fontSize: 22, color: '#DC2626' }}>{data.filter((r) => r.status === 'suspended').length}</strong>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Rider',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 800 }}>{r.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{r.email || '—'}</div>
              </div>
            ),
          },
          { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
          { key: 'vehicle', header: 'Vehicle', render: (r) => (r.city ?? 'Bike').toUpperCase() },
          {
            key: 'duty',
            header: 'Duty',
            render: (r) => (
              <StatusBadge label={r.isOnline ? 'Online' : 'Offline'} tone={r.isOnline ? 'success' : 'neutral'} />
            ),
          },
          {
            key: 'status',
            header: 'Account',
            render: (r) => (
              <StatusBadge label={r.status} tone={r.status === 'approved' ? 'success' : 'error'} />
            ),
          },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <SecondaryButton onClick={() => void review(r, r.status === 'suspended' ? 'approved' : 'suspended')}>
                {r.status === 'suspended' ? 'Restore' : 'Suspend'}
              </SecondaryButton>
            ),
          },
        ]}
        data={filtered}
        rowKey={(r) => r.id}
        emptyState={<EmptyState title="No riders yet" description="Approved delivery riders appear here." />}
      />
    </div>
  );
};

export const RiderApplicationsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useAdminList<AppRow>('rider-applications');

  const review = async (r: AppRow, status: 'approved' | 'rejected') => {
    try {
      await adminHttpClient.patch(`/admin/riders/${r.id}/review`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'rider-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast(`Rider application ${status}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update rider application');
    }
  };

  if (isLoading) return <LoadingSkeleton height={220} />;
  if (isError) return <ErrorState message="Failed to load rider applications." onRetry={() => void refetch()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="zr-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Rider Applications</h2>
          <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Verify rider identity, license, and vehicle documents
          </span>
        </div>
        <StatusBadge label={`${data.length} applications`} tone={data.length > 0 ? 'warning' : 'success'} />
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Applicant', render: (r) => <strong>{r.name}</strong> },
          { key: 'city', header: 'Vehicle', render: (r) => r.city.toUpperCase() },
          {
            key: 'submitted',
            header: 'Submitted',
            render: (r) => new Date(r.submittedAt).toLocaleDateString(),
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} tone="warning" /> },
          {
            key: 'act',
            header: 'Actions',
            render: (r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <PrimaryButton onClick={() => void review(r, 'approved')}>Approve</PrimaryButton>
                <SecondaryButton onClick={() => void review(r, 'rejected')}>Reject</SecondaryButton>
              </div>
            ),
          },
        ]}
        data={data}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No pending rider applications"
            description="New rider registrations awaiting verification appear here."
          />
        }
      />
    </div>
  );
};
