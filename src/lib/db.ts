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
 */
export async function ensureDbInitialized(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    throw new Error('Database connection failed. Please check your DATABASE_URL.')
  }

  if (tablesEnsured) return

  const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgresql')
  if (isPostgres) {
    await ensurePostgresTables()
  }

  tablesEnsured = true
}

/**
 * SQL to create all required tables with IF NOT EXISTS.
 * Safe to run multiple times - won't error if tables already exist.
 */
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS novel_projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, genre TEXT,
    sub_genre TEXT, cover_image TEXT, status TEXT NOT NULL DEFAULT 'draft',
    word_count INTEGER NOT NULL DEFAULT 0, target_words INTEGER, setting TEXT,
    premise TEXT, writing_style TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, role TEXT, title TEXT, age TEXT, gender TEXT,
    description TEXT, personality TEXT, background TEXT, abilities TEXT,
    relationships TEXT, motivation TEXT, arc TEXT, tags TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, category TEXT, description TEXT, history TEXT,
    features TEXT, atmosphere TEXT, tags TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS lore_items (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, category TEXT, description TEXT, details TEXT,
    constraints TEXT, tags TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS factions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, goals TEXT, members TEXT,
    territory TEXT, power TEXT, tags TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS outlines (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'act', description TEXT,
    key_events TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    outline_id TEXT REFERENCES outlines(id) ON DELETE SET NULL,
    title TEXT NOT NULL, summary TEXT, beats TEXT, content TEXT,
    word_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS chapter_versions (
    id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    content TEXT NOT NULL, word_count INTEGER NOT NULL DEFAULT 0,
    label TEXT, change_note TEXT, source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, category TEXT, content TEXT, source TEXT, tags TEXT,
    is_global BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS version_snapshots (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'milestone',
    data TEXT NOT NULL, note TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS change_proposals (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'revision',
    target_scope TEXT, impact TEXT, plan TEXT, status TEXT NOT NULL DEFAULT 'proposed',
    applied_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title TEXT, context TEXT, messages TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
  CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
  CREATE INDEX IF NOT EXISTS idx_lore_items_project ON lore_items(project_id);
  CREATE INDEX IF NOT EXISTS idx_factions_project ON factions(project_id);
  CREATE INDEX IF NOT EXISTS idx_outlines_project ON outlines(project_id);
  CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
  CREATE INDEX IF NOT EXISTS idx_chapters_outline ON chapters(outline_id);
  CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter ON chapter_versions(chapter_id);
  CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id);
  CREATE INDEX IF NOT EXISTS idx_version_snapshots_project ON version_snapshots(project_id);
  CREATE INDEX IF NOT EXISTS idx_change_proposals_project ON change_proposals(project_id);
  CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON ai_conversations(project_id);
`

/**
 * Ensure all PostgreSQL tables exist.
 * Uses Neon direct (non-pooling) URL for DDL because
 * Neon's pooler endpoint (pgbouncer) may not support DDL reliably.
 */
async function ensurePostgresTables(): Promise<void> {
  // Try using the direct/non-pooling URL for DDL
  const directUrl = process.env['mojing_POSTGRES_URL_NON_POOLING']
    || process.env['mojing_DATABASE_URL_UNPOOLED']
    || process.env['mojing_POSTGRES_URL']
    || null

  if (directUrl) {
    try {
      console.log('[DB] Creating tables via direct Neon connection...')
      const directClient = new PrismaClient({
        datasources: { db: { url: directUrl } },
        log: [],
      })
      try {
        await directClient.$executeRawUnsafe(CREATE_TABLES_SQL)
        console.log('[DB] ✅ Tables created via direct connection')
      } finally {
        await directClient.$disconnect()
      }
      return
    } catch (err) {
      console.error('[DB] Direct connection DDL failed:', err instanceof Error ? err.message : err)
    }
  }

  // Fallback: try with pooler connection
  try {
    console.log('[DB] Trying table creation via pooler connection...')
    await db.$executeRawUnsafe(CREATE_TABLES_SQL)
    console.log('[DB] ✅ Tables created via pooler connection')
  } catch (err) {
    console.error('[DB] ❌ Table creation failed:', err instanceof Error ? err.message : err)
    // Don't throw - the specific query will fail with a more helpful error
  }
}
