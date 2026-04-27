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
    // Check if database exists by trying a simple query
    await db.$queryRaw`SELECT 1 FROM NovelProject LIMIT 1`
    dbInitialized = true
  } catch {
    // Database tables don't exist - need to create them
    // Use Prisma's internal push mechanism
    try {
      // Create tables using raw SQL for Vercel serverless
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS NovelProject (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          genre TEXT,
          subGenre TEXT,
          coverImage TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          wordCount INTEGER NOT NULL DEFAULT 0,
          targetWords INTEGER,
          setting TEXT,
          premise TEXT,
          writingStyle TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Character (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
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
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Location (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          description TEXT,
          history TEXT,
          features TEXT,
          atmosphere TEXT,
          tags TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS LoreItem (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          description TEXT,
          details TEXT,
          constraints TEXT,
          tags TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Faction (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          goals TEXT,
          members TEXT,
          territory TEXT,
          power TEXT,
          tags TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Outline (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'act',
          description TEXT,
          keyEvents TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Chapter (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          outlineId TEXT,
          title TEXT NOT NULL,
          summary TEXT,
          beats TEXT,
          content TEXT,
          wordCount INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'planned',
          notes TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE,
          FOREIGN KEY (outlineId) REFERENCES Outline(id) ON DELETE SET NULL
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ChapterVersion (
          id TEXT PRIMARY KEY,
          chapterId TEXT NOT NULL,
          content TEXT NOT NULL,
          wordCount INTEGER NOT NULL,
          label TEXT,
          changeNote TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Material (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT,
          content TEXT,
          source TEXT,
          tags TEXT,
          isGlobal INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS VersionSnapshot (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          label TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'milestone',
          data TEXT NOT NULL,
          note TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ChangeProposal (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL DEFAULT 'revision',
          targetScope TEXT,
          impact TEXT,
          plan TEXT,
          status TEXT NOT NULL DEFAULT 'proposed',
          appliedAt DATETIME,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS AiConversation (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          title TEXT,
          context TEXT,
          messages TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES NovelProject(id) ON DELETE CASCADE
        );
      `)
      console.log('Database tables created on Vercel')
    } catch (createErr) {
      console.error('Failed to create database tables:', createErr)
    }
    dbInitialized = true
  }
}
