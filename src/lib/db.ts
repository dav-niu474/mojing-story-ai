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

// Track whether we've already ensured tables exist (per cold start)
let tablesEnsured = false

/**
 * Ensure database connection is ready and tables exist.
 * Called at the start of every API route.
 *
 * Optimization: Instead of running all DDL on every cold start,
 * we first check if a core table exists. If it does, we skip DDL
 * entirely (tables were created by `prisma db push` during build).
 * Only if the table doesn't exist do we run the full DDL suite.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (tablesEnsured) return

  try {
    // Quick connection check
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    throw new Error('Database connection failed. Please check your DATABASE_URL.')
  }

  const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgresql')
  if (isPostgres) {
    // Check if core table exists before running DDL
    const tablesExist = await checkCoreTablesExist()
    if (!tablesExist) {
      console.log('[DB] Core tables not found, running DDL...')
      await ensurePostgresTables()
    } else {
      console.log('[DB] ✅ Core tables exist, skipping DDL')
    }
  }

  tablesEnsured = true
}

/**
 * Quick check if the core novel_projects table exists.
 * This is much faster than running all DDL statements.
 */
async function checkCoreTablesExist(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT id FROM novel_projects LIMIT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Individual SQL statements for table creation.
 * Split into separate statements because pgbouncer/pooler connections
 * may not support multi-statement DDL in a single call.
 */
const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS novel_projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, genre TEXT,
    sub_genre TEXT, cover_image TEXT, status TEXT NOT NULL DEFAULT 'draft',
    word_count INTEGER NOT NULL DEFAULT 0, target_words INTEGER, setting TEXT,
    premise TEXT, writing_style TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, role TEXT, title TEXT, age TEXT, gender TEXT,
    description TEXT, personality TEXT, background TEXT, abilities TEXT,
    relationships TEXT, motivation TEXT, arc TEXT, tags TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, category TEXT, description TEXT, history TEXT,
    features TEXT, atmosphere TEXT, tags TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS lore_items (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, category TEXT, description TEXT, details TEXT,
    constraints TEXT, tags TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS factions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, goals TEXT, members TEXT,
    territory TEXT, power TEXT, tags TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS outlines (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'act', description TEXT,
    key_events TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    outline_id TEXT REFERENCES outlines(id) ON DELETE SET NULL,
    title TEXT NOT NULL, summary TEXT, beats TEXT, content TEXT,
    word_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chapter_versions (
    id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    content TEXT NOT NULL, word_count INTEGER NOT NULL DEFAULT 0,
    label TEXT, change_note TEXT, source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, category TEXT, content TEXT, source TEXT, tags TEXT,
    is_global BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS version_snapshots (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'milestone',
    data TEXT NOT NULL, note TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS change_proposals (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'revision',
    target_scope TEXT, impact TEXT, plan TEXT, status TEXT NOT NULL DEFAULT 'proposed',
    applied_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT, context TEXT, messages TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lore_items_project ON lore_items(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_factions_project ON factions(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_outlines_project ON outlines(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_outline ON chapters(outline_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter ON chapter_versions(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_version_snapshots_project ON version_snapshots(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_change_proposals_project ON change_proposals(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON ai_conversations(project_id)`,
]

/**
 * Get the direct (non-pooling) database URL for DDL operations.
 * Checks multiple possible env var names across different Neon integration naming conventions.
 */
function getDirectUrl(): string | null {
  // Check all possible prefixes for Neon direct URL
  // Vercel Neon integration creates env vars with project prefix
  const prefixes = ['moling_', 'mojing_', 'POSTGRES_', '']
  const directSuffixes = [
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_PRISMA_URL',
    'PGHOST_UNPOOLED',
  ]

  for (const prefix of prefixes) {
    for (const suffix of directSuffixes) {
      const key = prefix + suffix
      const val = process.env[key]
      if (val && val.startsWith('postgresql') && !val.includes('pooler')) {
        console.log(`[DB] Found direct URL via env var: ${key}`)
        return val
      }
    }
  }

  // Also check DIRECT_URL explicitly set
  const directUrl = process.env.DIRECT_URL
  if (directUrl && directUrl.startsWith('postgresql')) {
    console.log('[DB] Found direct URL via DIRECT_URL')
    return directUrl
  }

  return null
}

/**
 * Execute DDL statements one by one using a PrismaClient.
 * This is more reliable than multi-statement execution, especially through pgbouncer.
 */
async function executeDDLStatements(client: PrismaClient): Promise<void> {
  for (let i = 0; i < DDL_STATEMENTS.length; i++) {
    const sql = DDL_STATEMENTS[i]
    try {
      await client.$executeRawUnsafe(sql)
    } catch (err) {
      // Log but don't throw - some statements may fail if tables already exist
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('already exists')) {
        // Table/index already exists, this is fine
        continue
      }
      console.error(`[DB] DDL statement ${i + 1} failed: ${errMsg.substring(0, 200)}`)
      throw err
    }
  }
}

/**
 * Ensure all PostgreSQL tables exist.
 * Uses Neon direct (non-pooling) URL for DDL because
 * Neon's pooler endpoint (pgbouncer) may not support DDL reliably.
 */
async function ensurePostgresTables(): Promise<void> {
  // Try using the direct/non-pooling URL for DDL
  const directUrl = getDirectUrl()

  if (directUrl) {
    try {
      console.log('[DB] Creating tables via direct Neon connection...')
      const directClient = new PrismaClient({
        datasources: { db: { url: directUrl } },
        log: [],
      })
      try {
        await executeDDLStatements(directClient)
        console.log('[DB] ✅ Tables created via direct connection')
        return
      } finally {
        await directClient.$disconnect()
      }
    } catch (err) {
      console.error('[DB] Direct connection DDL failed:', err instanceof Error ? err.message : err)
    }
  }

  // Fallback: try with pooler connection (execute statements individually)
  try {
    console.log('[DB] Trying table creation via pooler connection (individual statements)...')
    await executeDDLStatements(db)
    console.log('[DB] ✅ Tables created via pooler connection')
  } catch (err) {
    console.error('[DB] ❌ Table creation failed:', err instanceof Error ? err.message : err)
    // Don't throw - the specific query will fail with a more helpful error
  }
}
