import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { ApiClientError, formatMoney } from '@zestroute/shared';
import { InputField, PrimaryButton, SecondaryButton, StatusBadge, useToast } from '../../components/ui';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { theme, locale, toggleTheme, toggleLocale, restaurantId } = useRestaurantStore();
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [chargeDelivery, setChargeDelivery] = useState(true);
  const [deliveryFeePkr, setDeliveryFeePkr] = useState('120');
  const [saving, setSaving] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantHttpClient
      .get<{ isAcceptingOrders?: boolean; deliveryFeeMinor?: number }>(`/restaurant/${restaurantId}/profile`)
      .then((p) => {
        setAcceptingOrders(p.isAcceptingOrders ?? true);
        const feeMinor = p.deliveryFeeMinor ?? 12000;
        setChargeDelivery(feeMinor > 0);
        setDeliveryFeePkr(String(Math.round(feeMinor / 100)));
      })
      .catch(() => {});
  }, [restaurantId]);

  const handleToggleAccepting = async () => {
    if (!restaurantId) return;
    const next = !acceptingOrders;
    setSaving(true);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/profile`, {
        isAcceptingOrders: next,
      });
      setAcceptingOrders(next);
      showToast(next ? 'Store is now accepting live orders' : 'Store paused for new orders', 'success');
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update store status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeliveryFee = async (overrideFeePkr?: number) => {
    if (!restaurantId) return;
    const pkr = overrideFeePkr !== undefined ? overrideFeePkr : Math.max(0, Number(deliveryFeePkr) || 0);
    const feeMinor = Math.round(pkr * 100);
    setSavingDelivery(true);
    try {
      await restaurantHttpClient.patch(`/restaurant/${restaurantId}/profile`, {
        deliveryFeeMinor: feeMinor,
      });
      setChargeDelivery(feeMinor > 0);
      setDeliveryFeePkr(String(pkr));
      showToast(
        feeMinor === 0
          ? 'Delivery charges removed — Customers now get FREE Delivery!'
          : `Delivery charge updated to ${formatMoney(feeMinor)}!`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : 'Failed to update delivery charges', 'error');
    } finally {
      setSavingDelivery(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 740 }}>
      {/* Owner-Controlled Delivery Charges Card */}
      <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--zr-primary-soft)',
                color: 'var(--zr-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Delivery Charges Control</h2>
                <StatusBadge
                  label={chargeDelivery ? `PKR ${Number(deliveryFeePkr) || 0} Fee` : 'FREE DELIVERY'}
                  tone={chargeDelivery ? 'warning' : 'success'}
                />
              </div>
              <div style={{ fontSize: 13, color: 'var(--zr-text-secondary)', marginTop: 2 }}>
                Add a custom delivery fee or remove delivery charges completely for your customers.
              </div>
            </div>
          </div>

          <SecondaryButton
            disabled={savingDelivery}
            onClick={() => void handleSaveDeliveryFee(chargeDelivery ? 0 : Math.max(100, Number(deliveryFeePkr) || 120))}
          >
            {chargeDelivery ? 'Remove Delivery Fee (Make Free)' : 'Enable Delivery Fee'}
          </SecondaryButton>
        </div>

        {/* Quick Preset Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, 80, 120, 150, 200, 250].map((preset) => {
            const active = (Number(deliveryFeePkr) || 0) === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setDeliveryFeePkr(String(preset));
                  setChargeDelivery(preset > 0);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${active ? 'var(--zr-primary)' : 'var(--zr-border)'}`,
                  background: active ? 'var(--zr-primary-soft)' : 'var(--zr-surface)',
                  color: active ? 'var(--zr-primary)' : 'var(--zr-text)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                {preset === 0 ? 'Free (PKR 0)' : `PKR ${preset}`}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <InputField
              label="Custom Delivery Charge (PKR)"
              type="number"
              min="0"
              placeholder="0 for Free Delivery"
              value={deliveryFeePkr}
              onChange={(e) => {
                setDeliveryFeePkr(e.target.value);
                setChargeDelivery((Number(e.target.value) || 0) > 0);
              }}
            />
          </div>
          <PrimaryButton disabled={savingDelivery} onClick={() => void handleSaveDeliveryFee()}>
            {savingDelivery ? 'Saving...' : 'Save Delivery Charges'}
          </PrimaryButton>
        </div>
      </div>

      {/* Store & Dashboard Settings */}
      <div className="zr-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Store &amp; Dashboard Settings</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--zr-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>Live Order Acceptance</strong>
              <StatusBadge label={acceptingOrders ? 'Open' : 'Paused'} tone={acceptingOrders ? 'success' : 'warning'} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--zr-text-secondary)', marginTop: 4 }}>
              Pause incoming customer orders during kitchen rush hours.
            </div>
          </div>
          <PrimaryButton onClick={() => void handleToggleAccepting()} disabled={saving}>
            {acceptingOrders ? 'Pause Orders' : 'Resume Orders'}
          </PrimaryButton>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <strong>Theme Mode</strong>
            <div style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>Current: {theme}</div>
          </div>
          <SecondaryButton onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'}
          </SecondaryButton>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <strong>Language &amp; Layout Direction</strong>
            <div style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>
              Current: {locale === 'en' ? 'English (LTR)' : 'Urdu (RTL)'}
            </div>
          </div>
          <SecondaryButton onClick={toggleLocale}>
            Switch to {locale === 'en' ? 'اردو (RTL)' : 'English (LTR)'}
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
};
