import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { APPROVAL_STATUS_META } from '@zestroute/shared';
import { PrimaryButton, SecondaryButton, StatusBadge } from '../../components/ui';
import { useRestaurantStore } from '../../store/useRestaurantStore';

export const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const approvalStatus = useRestaurantStore((s) => s.approvalStatus);
  const meta = APPROVAL_STATUS_META[approvalStatus];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="zr-card" style={{ maxWidth: 480, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 9999, background: 'var(--zr-primary-soft)', color: 'var(--zr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldAlert size={30} />
        </div>
        <StatusBadge label={`Status: ${meta.labelEn}`} tone={meta.tone} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Restaurant Verification Gate</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--zr-text-secondary)' }}>
          Only admin-approved restaurants can accept live customer orders. Your business documents and profile are under review.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <PrimaryButton onClick={() => navigate('/dashboard')}>Preview Dashboard UI</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/login')}>Back to Login</SecondaryButton>
        </div>
      </div>
    </div>
  );
};
