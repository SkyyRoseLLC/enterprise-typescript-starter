#!/bin/bash

# Production build script

set -e

echo "🏗️  Building Enterprise TypeScript Starter for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run linting and type checking
echo "🔍 Running linting and type checking..."
npm run lint
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm run test

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Built files are in the 'dist' directory"