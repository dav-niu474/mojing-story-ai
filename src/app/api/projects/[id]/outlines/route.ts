import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/outlines - List outlines with chapter count
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const outlines = await db.outline.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { chapters: true } },
      },
    });
    return successResponse(outlines);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch outlines';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/outlines - Create outline
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { title, type, description, keyEvents, sortOrder } = body;

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const outline = await db.outline.create({
      data: {
        projectId: id,
        title,
        type: type || 'act',
        description,
        keyEvents,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(outline, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create outline';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/outlines - Update outline (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, title, type, description, keyEvents, sortOrder } = body;

    if (!id) {
      return errorResponse('Outline id is required', 400);
    }

    const existing = await db.outline.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Outline not found', 404);
    }

    const outline = await db.outline.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(keyEvents !== undefined && { keyEvents }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(outline);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update outline';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/outlines - Delete outline (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Outline id is required', 400);
    }

    const existing = await db.outline.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Outline not found', 404);
    }

    await db.outline.delete({ where: { id } });
    return successResponse({ message: 'Outline deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete outline';
    return errorResponse(message);
  }
}
