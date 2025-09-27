import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/forms/Input';
import { useAuthContext } from '@/hooks/useAuth';
import { useForm } from '@/hooks/useForm';
import type { LoginRequest } from '@/types';
import { validationRules } from '@/utils/validation';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuthContext();
  const navigate = useNavigate();

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useForm<LoginRequest>({
    initialValues: {
      email: '',
      password: '',
    },
    validationRules: {
      email: validationRules.email,
      password: { required: true },
    },
    onSubmit: async (formData) => {
      try {
        await login(formData);
        navigate('/dashboard');
      } catch (err) {
        console.error('Login failed:', err);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
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
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Sign in
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Demo credentials: demo@example.com / DemoPass123!
          </p>
        </div>
      </div>
    </div>
  );
};