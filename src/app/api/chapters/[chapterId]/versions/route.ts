import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse, countWords } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// GET /api/chapters/[chapterId]/versions - List all versions for a chapter
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { chapterId } = await params;

    const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      return errorResponse('Chapter not found', 404);
    }

    const versions = await db.chapterVersion.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(versions);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch chapter versions';
    return errorResponse(message);
  }
}

// POST /api/chapters/[chapterId]/versions - Create a new version (snapshot current content)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { chapterId } = await params;

    const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      return errorResponse('Chapter not found', 404);
    }

    const body = await request.json();
    const { label, changeNote, source, content } = body;

    // Use provided content or snapshot current chapter content
    const versionContent = content || chapter.content || '';
    const wordCount = countWords(versionContent);

    // Count existing versions to generate a label if not provided
    const existingCount = await db.chapterVersion.count({
      where: { chapterId },
    });

    const version = await db.chapterVersion.create({
      data: {
        chapterId,
        content: versionContent,
        wordCount,
        label: label || `版本${existingCount + 1}`,
        changeNote: changeNote || null,
        source: source || 'manual',
      },
    });

    return successResponse(version, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create chapter version';
    return errorResponse(message);
  }
}
