import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// PrismaClient singleton for Next.js
// Prevents creating multiple instances during hot reload in development

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  // Create a connection pool
  const pool = new Pool({ connectionString });

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  // Create and return PrismaClient with the adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
