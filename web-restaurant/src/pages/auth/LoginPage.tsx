import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { InputField, PrimaryButton, ZestRouteLogo, useToast } from '../../components/ui';
import { restaurantLoginSchema } from '../../features/validation/restaurantSchemas';
import { restaurantAuthApi, restaurantHttpClient, restaurantTokenStorage } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { ApiClientError, type ApprovalStatus } from '@zestroute/shared';

type LoginForm = { email: string; password: string };

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setRestaurantContext = useRestaurantStore((s) => s.setRestaurantContext);
  const [showPass, setShowPass] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(restaurantLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await restaurantAuthApi.login({ identifier: data.email, password: data.password });
      const allowed = res.user.roles.some((r) =>
        ['restaurant_owner', 'restaurant_staff', 'super_admin'].includes(r)
      );
      if (!allowed) {
        showToast('Account lacks restaurant portal permissions', 'error');
        return;
      }
      restaurantTokenStorage.setTokens(res.accessToken, res.refreshToken);
      const mine = await restaurantHttpClient
        .get<Array<{ id: string; name: string; status: ApprovalStatus }>>('/restaurant/mine')
        .catch(() => []);
      if (mine.length > 0) {
        const preferred =
          mine.find((m) => m.name.toLowerCase().includes('pizza box')) ?? mine[0];
        setRestaurantContext(preferred.name, preferred.status, preferred.id);
      }
      showToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to reach authentication server';
      showToast(msg, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="zr-card" style={{ width: '100%', maxWidth: 440, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ZestRouteLogo />
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Restaurant Portal Sign In</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--zr-text-secondary)' }}>
            Manage your branches, menu, live orders, and earnings.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <InputField
                label="Email Address"
                placeholder="owner@restaurant.com"
                error={errors.email?.message}
                leftIcon={<Mail size={16} color="var(--zr-text-secondary)" />}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <InputField
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter password"
                error={errors.password?.message}
                leftIcon={<Lock size={16} color="var(--zr-text-secondary)" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zr-text-secondary)' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...field}
              />
            )}
          />
          <PrimaryButton type="submit" fullWidth>
            Sign In to Dashboard
          </PrimaryButton>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <Link to="/register" style={{ color: 'var(--zr-primary)', fontWeight: 600 }}>
            Register Your Restaurant
          </Link>
          <Link to="/design-system" style={{ color: 'var(--zr-text-secondary)' }}>
            Design System
          </Link>
        </div>
      </div>
    </div>
  );
};
