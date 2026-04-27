import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create the appropriate Prisma client based on DATABASE_URL
 *
 * Strategy:
 * - file: URL → SQLite (local development) — standard PrismaClient
 * - postgresql:// URL → PostgreSQL (Vercel Neon) — PrismaClient with Neon adapter
 *
 * IMPORTANT: The Prisma client must be generated with the matching schema:
 * - Local dev:  `prisma generate`                      (uses prisma/schema.prisma — SQLite)
 * - Vercel:     `prisma generate --schema=prisma/schema.postgres.prisma` (PostgreSQL)
 */
async function createPrismaClientForPostgres(databaseUrl: string): Promise<PrismaClient> {
  // Dynamic imports for Neon adapter — only loaded when using PostgreSQL
  const { Pool } = await import('@neondatabase/serverless')
  const { PrismaNeon } = await import('@prisma/adapter-neon')

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaNeon(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

function createPrismaClientForSqlite(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || 'file:./db/custom.db',
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || ''
  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')

  if (isPostgres) {
    // For PostgreSQL/Neon: We create a sync client here, but the adapter will be
    // initialized asynchronously. For Vercel deployments, the schema.postgres.prisma
    // with driverAdapters will be used, and the adapter will be set up properly.
    // Fallback to standard client for cases where async init isn't feasible at module level.
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

  return createPrismaClientForSqlite(databaseUrl)
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure database connection is ready
 * - For PostgreSQL: verifies connection is alive
 * - For SQLite: auto-creates file if needed
 *
 * On Vercel with PostgreSQL, tables are created via `prisma db push`
 * or migrations — no need for runtime DDL.
 */
export async function ensureDbInitialized(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('Database connection failed:', error)
    throw new Error(
      'Database connection failed. Please check your DATABASE_URL environment variable. ' +
      'For Vercel, run: prisma db push --schema=prisma/schema.postgres.prisma'
    )
  }
}

/**
 * Async version for explicit initialization (useful for PostgreSQL/Neon)
 */
export { createPrismaClientForPostgres }
