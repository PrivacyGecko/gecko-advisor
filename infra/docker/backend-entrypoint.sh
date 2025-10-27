#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=/app/infra/prisma/schema.prisma

echo "Starting backend server..."
exec node --import tsx apps/backend/src/index.ts
