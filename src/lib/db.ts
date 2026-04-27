import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// On Vercel, use /tmp for SQLite (only writable directory in serverless)
function getDatabaseUrl(): string {
  if (process.env.VERCEL) {
    return 'file:/tmp/mojing-story.db'
  }
  return process.env.DATABASE_URL || 'file:./db/custom.db'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Initialize the database on Vercel serverless environment
let dbInitialized = false

export async function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return
  if (!process.env.VERCEL) {
    dbInitialized = true
    return
  }
  
  try {
    // Check if database exists by trying to query
    await db.$queryRaw`SELECT 1`
    dbInitialized = true
  } catch {
    // Database doesn't exist - create it
    const { execSync } = await import('child_process')
    try {
      const dbUrl = getDatabaseUrl()
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'pipe',
        timeout: 30000,
      })
      console.log('Database initialized on Vercel')
    } catch (err) {
      console.error('Failed to initialize database:', err)
    }
    dbInitialized = true
  }
}
