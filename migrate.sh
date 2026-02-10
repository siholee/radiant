#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Wait for postgres to be ready
until node -e "const { PrismaClient } = require('.prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => process.exit(0)).catch(() => process.exit(1))"; do
  echo "⏳ Waiting for database to be ready..."
  sleep 2
done

echo "✅ Database is ready"

# Run migrations using node directly with prisma binary
node -e "
const { execSync } = require('child_process');
try {
  execSync('node node_modules/prisma/build/index.js migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  console.log('✅ Migrations completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
"

echo "🚀 Starting application..."
exec "$@"
