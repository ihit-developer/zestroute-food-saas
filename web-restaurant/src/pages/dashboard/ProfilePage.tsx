import React, { useEffect, useState } from 'react';
import { ApiClientError } from '@zestroute/shared';
import { InputField, PrimaryButton, useToast } from '../../components/ui';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface RestaurantProfileData {
  id: string;
  name: string;
  description: string;
  phone: string;
  logoUrl: string;
  coverImageUrl: string;
  deliveryRadiusKm: number;
  minOrderMinor: number;
  defaultPrepTimeMins: number;
  isAcceptingOrders: boolean;
}

export const ProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('8');
  const [minOrderPkr, setMinOrderPkr] = useState('400');
  const [prepTimeMins, setPrepTimeMins] = useState('25');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  useEffect(() => {
    if (!restaurantId) return;
    restaurantHttpClient
      .get<RestaurantProfileData>(`/restaurant/${restaurantId}/profile`)
      .then((p) => {
        setName(p.name ?? '');
        setPhone(p.phone ?? '');
        setDescription(p.description ?? '');
        setDeliveryRadiusKm(String(p.deliveryRadiusKm ?? 8));
        setMinOrderPkr(String(Math.round((p.minOrderMinor ?? 40000) / 100)));
        setPrepTimeMins(String(p.defaultPrepTimeMins ?? 25));
        setLogoUrl(p.logoUrl ?? '');
        setCoverImageUrl(p.coverImageUrl ?? '');
      })
      .catch(() => {});
  }, [restaurantId]);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/profile`, {
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
        deliveryRadiusKm: Math.max(1, Number(deliveryRadiusKm) || 8),
        minOrderMinor: Math.max(0, Math.round((Number(minOrderPkr) || 0) * 100)),
        defaultPrepTimeMins: Math.max(5, Number(prepTimeMins) || 25),
        logoUrl: logoUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
      });
      showToast('Restaurant profile saved to MongoDB!', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Restaurant Profile Management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <InputField label="Restaurant Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter restaurant name" />
        <InputField label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
        <InputField label="Delivery Radius (km)" type="number" value={deliveryRadiusKm} onChange={(e) => setDeliveryRadiusKm(e.target.value)} />
        <InputField label="Minimum Order (PKR)" type="number" value={minOrderPkr} onChange={(e) => setMinOrderPkr(e.target.value)} />
        <InputField label="Default Prep Time (mins)" type="number" value={prepTimeMins} onChange={(e) => setPrepTimeMins(e.target.value)} />
        <InputField label="Short Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Authentic flavors delivered fresh" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InputField label="Logo Image URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          {logoUrl.trim() ? <img src={logoUrl.trim()} alt="Logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12 }} /> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InputField label="Cover Image URL" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
          {coverImageUrl.trim() ? <img src={coverImageUrl.trim()} alt="Cover" style={{ width: '100%', maxHeight: 110, objectFit: 'cover', borderRadius: 12 }} /> : null}
        </div>
      </div>
      <div>
        <PrimaryButton onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile Changes'}
        </PrimaryButton>
      </div>
    </div>
  );
};
