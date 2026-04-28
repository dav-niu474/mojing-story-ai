import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || ''
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || 'file:./db/custom.db',
      },
    },
    log: [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure database connection is ready.
 * Called at the start of every API route.
 *
 * Tables should already exist from `prisma db push` during build.
 * We do NOT run DDL at runtime to avoid cold start overhead.
 * If tables don't exist, the actual query will fail with a specific error.
 */
export async function ensureDbInitialized(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    throw new Error('Database connection failed. Please check your DATABASE_URL.')
  }
}
