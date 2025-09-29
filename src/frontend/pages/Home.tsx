import React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useAuthContext } from '@/hooks/useAuth';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuthContext();

  const features = [
    {
      title: 'TypeScript Full-Stack',
      description: 'End-to-end type safety with TypeScript across frontend and backend.',
      icon: '⚡',
    },
    {
      title: 'Clean Architecture',
      description: 'Well-structured codebase with separation of concerns and maintainable patterns.',
      icon: '🏗️',
    },
    {
      title: 'Production Ready',
      description: 'Docker, CI/CD, security best practices, and comprehensive testing.',
      icon: '🚀',
    },
    {
      title: 'Developer Experience',
      description: 'ESLint, Prettier, hot reload, and comprehensive tooling setup.',
      icon: '🛠️',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Enterprise TypeScript Starter
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Production-ready full-stack TypeScript application with modern architecture,
          comprehensive tooling, and best practices built-in.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          {isAuthenticated ? (
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex">
              <Link to="/dashboard">
                <Button size="lg">
                  Go to Dashboard
                </Button>
              </Link>
              <span className="text-gray-600">
                Welcome back, {user?.name}!
              </span>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex">
              <Link to="/register">
                <Button size="lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Tech Stack
        </h2>
        <Card className="text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Frontend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>React 18</li>
                <li>TypeScript</li>
                <li>Vite</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Backend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Node.js</li>
                <li>Express.js</li>
                <li>TypeScript</li>
                <li>JWT Auth</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Development</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>ESLint</li>
                <li>Prettier</li>
                <li>Jest</li>
                <li>Husky</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Deployment</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Docker</li>
                <li>GitHub Actions</li>
                <li>Multi-stage Build</li>
                <li>Production Ready</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};