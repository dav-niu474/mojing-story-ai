import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create PrismaClient based on DATABASE_URL
 *
 * Strategy:
 * - postgresql:// or postgres:// → PostgreSQL (Vercel Postgres / Neon)
 *   Uses @neondatabase/serverless driver adapter for serverless compatibility
 * - file: → SQLite (local development only)
 *   Uses standard PrismaClient, requires schema.sqlite.prisma to be generated
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || ''
  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')

  if (isPostgres) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('@neondatabase/serverless')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaNeon } = require('@prisma/adapter-neon')

      const pool = new Pool({ connectionString: databaseUrl })
      const adapter = new PrismaNeon(pool)

      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    } catch (error) {
      console.error('Failed to initialize Neon adapter, falling back to standard client:', error)
      return new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    }
  }

  // SQLite (local development)
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
