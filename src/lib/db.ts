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
 *
 * This function is called at the start of every API route.
 * It checks:
 * 1. Database connection is alive
 * 2. Required tables exist (if not, creates them via raw SQL)
 *
 * The table creation only happens once per cold start.
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

  // Only check/create tables once per cold start
  if (tablesEnsured) return

  const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgresql')

  if (isPostgres) {
    await ensurePostgresTables()
  }

  tablesEnsured = true
}

/**
 * Ensure all required PostgreSQL tables exist.
 *
 * This is needed because Vercel's build-time `prisma db push` may silently
 * fail when using Neon's pooler endpoint. We use raw SQL as a fallback
 * to create any missing tables.
 *
 * Uses CREATE TABLE IF NOT EXISTS so it's safe to run multiple times.
 */
async function ensurePostgresTables(): Promise<void> {
  console.log('[DB] Checking PostgreSQL tables exist...')

  try {
    // Check if the main table exists
    const result = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'novel_projects'
      ) as exists
    `

    if (result[0]?.exists) {
      console.log('[DB] Tables already exist, skipping creation')
      return
    }

    console.log('[DB] Tables missing! Creating via raw SQL...')

    // Create all tables in dependency order
    await db.$executeRawUnsafe(`
      -- Main project table
      CREATE TABLE IF NOT EXISTS novel_projects (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        sub_genre TEXT,
        cover_image TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        word_count INTEGER NOT NULL DEFAULT 0,
        target_words INTEGER,
        setting TEXT,
        premise TEXT,
        writing_style TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Characters
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT,
        title TEXT,
        age TEXT,
        gender TEXT,
        description TEXT,
        personality TEXT,
        background TEXT,
        abilities TEXT,
        relationships TEXT,
        motivation TEXT,
        arc TEXT,
        tags TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Locations
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        history TEXT,
        features TEXT,
        atmosphere TEXT,
        tags TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Lore/World-building items
      CREATE TABLE IF NOT EXISTS lore_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        details TEXT,
        constraints TEXT,
        tags TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Factions
      CREATE TABLE IF NOT EXISTS factions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        goals TEXT,
        members TEXT,
        territory TEXT,
        power TEXT,
        tags TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Outlines
      CREATE TABLE IF NOT EXISTS outlines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'act',
        description TEXT,
        key_events TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Chapters
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        outline_id TEXT REFERENCES outlines(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        summary TEXT,
        beats TEXT,
        content TEXT,
        word_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'planned',
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Chapter versions
      CREATE TABLE IF NOT EXISTS chapter_versions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        label TEXT,
        change_note TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Materials
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT,
        content TEXT,
        source TEXT,
        tags TEXT,
        is_global BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Version snapshots
      CREATE TABLE IF NOT EXISTS version_snapshots (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'milestone',
        data TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Change proposals
      CREATE TABLE IF NOT EXISTS change_proposals (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'revision',
        target_scope TEXT,
        impact TEXT,
        plan TEXT,
        status TEXT NOT NULL DEFAULT 'proposed',
        applied_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI conversations
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
        title TEXT,
        context TEXT,
        messages TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Create indexes for common queries
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
    `)

    console.log('[DB] ✅ All tables created successfully')
  } catch (error) {
    console.error('[DB] ❌ Failed to create tables:', error)
    // Don't throw - let the request proceed and fail with a more specific error
    // This prevents blocking all API routes if table creation fails
  }
}
