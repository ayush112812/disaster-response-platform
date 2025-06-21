#!/bin/bash

# Setup development environment for Disaster Response Platform

echo "🚀 Setting up Disaster Response Platform development environment..."

# Check for required tools
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but not installed. Aborting."; exit 1; }
command -v git >/dev/null 2>&1 || { echo >&2 "git is required but not installed. Aborting."; exit 1; }

echo "✅ Found required tools"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up environment files
if [ ! -f .env ]; then
  echo "🔧 Creating .env file from example..."
  cp .env.example .env
  
  # Generate a secure JWT secret
  echo "🔑 Generating secure JWT secret..."
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
  rm -f .env.bak
  
  echo "\n⚠️  Please update the .env file with your actual API keys and configuration"
  echo "   Required services: Supabase, Google AI, Mapbox, and optionally Twitter"
  echo "\n   You can get these credentials from their respective developer portals."
  echo "   Don't forget to update the ALLOWED_ORIGINS with your frontend URL.\n"
else
  echo "✅ .env file already exists, skipping creation"
fi

# Set up test environment file
if [ ! -f test.env ]; then
  echo "🔧 Creating test environment file..."
  cp test.env.example test.env
fi

# Set up git hooks
echo "🔧 Setting up Git hooks..."
npx husky install

# Initialize the database
echo "\n📊 Initializing database..."
npm run db:init

echo "\n🎉 Setup complete!"
echo "\nNext steps:"
echo "1. Update the .env file with your API keys and configuration"
echo "2. Start the development server with: npm run dev"
echo "3. Access the API at http://localhost:5000"
echo "\nFor more information, check the README.md file.\n"
