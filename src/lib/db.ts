import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create PrismaClient
 *
 * - Vercel (PostgreSQL): DATABASE_URL=postgresql://... → standard PrismaClient
 * - Local (SQLite): DATABASE_URL=file:... → standard PrismaClient
 *
 * Prisma 6+ supports PostgreSQL connections natively in serverless
 * without needing the Neon adapter for most cases.
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || ''

  // Prisma 6 works with PostgreSQL directly in serverless environments
  // Connection pooling is handled by Neon's pooler endpoint
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || 'file:./db/custom.db',
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure database connection is ready
 */
export async function ensureDbInitialized(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('Database connection failed:', error)
    throw new Error(
      'Database connection failed. Please check your DATABASE_URL environment variable.'
    )
  }
}
