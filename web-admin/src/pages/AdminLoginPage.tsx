import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { InputField, PrimaryButton, SecondaryButton, ZestRouteLogo, useToast } from '../components/ui/AdminUI';
import { adminAuthApi, adminTokenStorage } from '../services/apiClient';
import { ApiClientError } from '@zestroute/shared';

const adminLoginSchema = z.object({
  email: z.string().trim().email('Valid admin email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ email: string; password: string }>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await adminAuthApi.login({ identifier: data.email, password: data.password });
      if (!res.user.roles.includes('super_admin')) {
        showToast('Super Admin role required');
        return;
      }
      adminTokenStorage.setTokens(res.accessToken, res.refreshToken);
      showToast('Welcome back, Super Admin!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to reach authentication server';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #3B1F0B 100%)',
      }}
    >
      <div
        className="zr-card"
        style={{
          width: '100%',
          maxWidth: 450,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ZestRouteLogo />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 800,
              color: '#F47B20',
              background: 'rgba(244,123,32,0.12)',
              padding: '5px 10px',
              borderRadius: 999,
            }}
          >
            <ShieldCheck size={13} /> SUPER ADMIN
          </span>
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Platform Command Sign In
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
            Access live MongoDB analytics, restaurants, riders, orders, and payouts.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <InputField
                label="Admin Email"
                placeholder="admin@zestroute.app"
                error={errors.email?.message}
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
                placeholder="Enter admin password"
                error={errors.password?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...field}
              />
            )}
          />
          <PrimaryButton type="submit" fullWidth disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Admin Console'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            fullWidth
            leftIcon={<Sparkles size={15} />}
            onClick={() => {
              setValue('email', 'admin@zestroute.app');
              setValue('password', 'AdminPass#2026!');
            }}
          >
            Fill Super Admin Credentials
          </SecondaryButton>
        </form>
      </div>
    </div>
  );
};
