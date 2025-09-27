import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/forms/Input';
import { useAuthContext } from '@/hooks/useAuth';
import { useForm } from '@/hooks/useForm';
import type { CreateUserRequest } from '@/types';
import { validationRules } from '@/utils/validation';

export const RegisterPage: React.FC = () => {
  const { register, isLoading, error } = useAuthContext();
  const navigate = useNavigate();

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useForm<CreateUserRequest>({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validationRules: {
      name: validationRules.name,
      email: validationRules.email,
      password: validationRules.password,
    },
    onSubmit: async (formData) => {
      try {
        await register(formData);
        navigate('/dashboard');
      } catch (err) {
        console.error('Registration failed:', err);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Input
              label="Full name"
              type="text"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              required
              autoComplete="name"
            />

            <Input
              label="Email address"
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              required
              autoComplete="new-password"
              helperText="Must contain at least 8 characters with uppercase, lowercase, number, and special character"
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Create account
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};