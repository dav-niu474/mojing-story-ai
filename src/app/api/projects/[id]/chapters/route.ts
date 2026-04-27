import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse, countWords } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/chapters - List chapters (optionally filter by outlineId)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const outlineId = searchParams.get('outlineId');

    const chapters = await db.chapter.findMany({
      where: {
        projectId: id,
        ...(outlineId && { outlineId }),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        outline: { select: { id: true, title: true } },
      },
    });
    return successResponse(chapters);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch chapters';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/chapters - Create chapter
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { title, outlineId, summary, beats, content, status, notes, sortOrder } = body;

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const wordCount = content ? countWords(content) : 0;

    const chapter = await db.chapter.create({
      data: {
        projectId: id,
        title,
        outlineId: outlineId || null,
        summary,
        beats,
        content,
        wordCount,
        status: status || 'planned',
        notes,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(chapter, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create chapter';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/chapters - Update chapter (send id in body, auto-calculate wordCount)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, title, outlineId, summary, beats, content, status, notes, sortOrder } = body;

    if (!id) {
      return errorResponse('Chapter id is required', 400);
    }

    const existing = await db.chapter.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Chapter not found', 404);
    }

    // Auto-calculate word count from content
    const finalContent = content !== undefined ? content : existing.content;
    const wordCount = finalContent ? countWords(finalContent) : 0;

    const chapter = await db.chapter.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(outlineId !== undefined && { outlineId: outlineId || null }),
        ...(summary !== undefined && { summary }),
        ...(beats !== undefined && { beats }),
        ...(content !== undefined && { content }),
        wordCount,
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // Update project total word count
    const chapterStats = await db.chapter.aggregate({
      where: { projectId: projectId },
      _sum: { wordCount: true },
    });
    await db.novelProject.update({
      where: { id: projectId },
      data: { wordCount: chapterStats._sum.wordCount || 0 },
    });

    return successResponse(chapter);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update chapter';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/chapters - Delete chapter (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Chapter id is required', 400);
    }

    const existing = await db.chapter.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Chapter not found', 404);
    }

    await db.chapter.delete({ where: { id } });

    // Update project total word count
    const chapterStats = await db.chapter.aggregate({
      where: { projectId: projectId },
      _sum: { wordCount: true },
    });
    await db.novelProject.update({
      where: { id: projectId },
      data: { wordCount: chapterStats._sum.wordCount || 0 },
    });

    return successResponse({ message: 'Chapter deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete chapter';
    return errorResponse(message);
  }
}
