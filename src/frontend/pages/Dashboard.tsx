import React, { useEffect, useState } from 'react';

import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthContext } from '@/hooks/useAuth';
import { apiGet } from '@/services/api';
import type { HealthCheckResponse } from '@/types';
import { formatDateTime } from '@/utils/format';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const data = await apiGet<HealthCheckResponse>('/health');
        setHealthData(data);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  const stats = [
    {
      title: 'API Status',
      value: healthData?.status === 'ok' ? 'Healthy' : 'Unknown',
      color: healthData?.status === 'ok' ? 'text-green-600' : 'text-yellow-600',
    },
    {
      title: 'Environment',
      value: healthData?.environment || 'Unknown',
      color: 'text-blue-600',
    },
    {
      title: 'Version',
      value: healthData?.version || 'Unknown',
      color: 'text-purple-600',
    },
    {
      title: 'Uptime',
      value: healthData?.uptime ? `${Math.floor(healthData.uptime / 60)} min` : 'Unknown',
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.name}! Here's what's happening with your application.
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.createdAt ? formatDateTime(user.createdAt) : 'Unknown'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Updated</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.updatedAt ? formatDateTime(user.updatedAt) : 'Unknown'}
            </p>
          </div>
        </div>
      </Card>

      {/* System Stats */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          System Status
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
                <p className={`mt-1 text-lg font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/profile"
            className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <h3 className="font-medium text-blue-900">Update Profile</h3>
            <p className="text-sm text-blue-700 mt-1">
              Change your name or email address
            </p>
          </a>
          <a
            href="https://github.com/SkyyRoseLLC/enterprise-typescript-starter"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <h3 className="font-medium text-green-900">View Source Code</h3>
            <p className="text-sm text-green-700 mt-1">
              Check out the GitHub repository
            </p>
          </a>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <h3 className="font-medium text-purple-900">API Health</h3>
            <p className="text-sm text-purple-700 mt-1">
              View raw API health endpoint
            </p>
          </a>
        </div>
      </Card>
    </div>
  );
};