#!/bin/bash

# Development startup script

set -e

echo "🚀 Starting Enterprise TypeScript Starter in development mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting and type checking
echo "🔍 Running linting and type checking..."
npm run lint
npm run type-check

# Start the development server
echo "🏃 Starting development servers..."
npm run dev