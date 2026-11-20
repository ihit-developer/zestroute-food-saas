import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageUploader, InputField, PrimaryButton, ZestRouteLogo, useToast } from '../../components/ui';
import { restaurantRegisterSchema } from '../../features/validation/restaurantSchemas';

type RegisterForm = {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  area: string;
  cuisineType: string;
  bankAccountTitle: string;
  bankIban: string;
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(restaurantRegisterSchema),
    defaultValues: {
      restaurantName: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
      address: '',
      city: '',
      area: '',
      cuisineType: '',
      bankAccountTitle: '',
      bankIban: '',
    },
  });

  const onSubmit = () => {
    showToast('Application submitted for Admin review (Phase 10 API)', 'info');
    navigate('/pending-approval');
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px' }}>
      <div className="zr-card" style={{ maxWidth: 820, margin: '0 auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <ZestRouteLogo />
          <Link to="/login" style={{ color: 'var(--zr-primary)', fontWeight: 600, fontSize: 14 }}>
            Already registered? Sign In
          </Link>
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Restaurant Partner Registration</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--zr-text-secondary)' }}>
            Submit your restaurant details, business verification documents, and payout bank info.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {(
              [
                { name: 'restaurantName', label: 'Restaurant Name', placeholder: 'e.g., Spice Courtyard' },
                { name: 'ownerName', label: 'Owner Full Name', placeholder: 'e.g., Tariq Mahmood' },
                { name: 'email', label: 'Business Email', placeholder: 'contact@restaurant.com' },
                { name: 'phone', label: 'Phone Number', placeholder: '03001234567' },
                { name: 'password', label: 'Password', placeholder: 'Min 8 characters', type: 'password' },
                { name: 'cuisineType', label: 'Cuisine Type', placeholder: 'BBQ, Burgers, Desi' },
                { name: 'city', label: 'City', placeholder: 'Lahore' },
                { name: 'area', label: 'Area', placeholder: 'Gulberg III' },
                { name: 'address', label: 'Full Address', placeholder: 'Plot 14, MM Alam Road' },
                { name: 'bankAccountTitle', label: 'Bank Account Title', placeholder: 'Spice Courtyard Pvt Ltd' },
                { name: 'bankIban', label: 'IBAN / Account Number', placeholder: 'PK36SCBL0000001123456702' },
              ] as const
            ).map((f) => (
              <Controller
                key={f.name}
                control={control}
                name={f.name}
                render={({ field }) => (
                  <InputField
                    label={f.label}
                    type={'type' in f ? f.type : 'text'}
                    placeholder={f.placeholder}
                    error={errors[f.name]?.message}
                    {...field}
                  />
                )}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <ImageUploader label="Restaurant Logo" onFileSelected={() => showToast('Logo selected', 'info')} />
            <ImageUploader label="Cover Image" onFileSelected={() => showToast('Cover selected', 'info')} />
            <ImageUploader label="Business License / NTN Document" onFileSelected={() => showToast('Document selected', 'info')} />
          </div>

          <PrimaryButton type="submit" fullWidth>
            Submit Restaurant Application
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
};
