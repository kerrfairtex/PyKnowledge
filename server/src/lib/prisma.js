import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Prisma 7+: pass datasourceUrl directly (url in schema is deprecated)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
