import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get project with all relations
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await db.novelProject.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { sortOrder: 'asc' } },
        locations: { orderBy: { sortOrder: 'asc' } },
        loreItems: { orderBy: { sortOrder: 'asc' } },
        factions: { orderBy: { sortOrder: 'asc' } },
        outlines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { chapters: true } },
          },
        },
        chapters: {
          orderBy: { sortOrder: 'asc' },
          include: {
            outline: { select: { id: true, title: true } },
          },
        },
        materials: { orderBy: { createdAt: 'desc' } },
        snapshots: { orderBy: { createdAt: 'desc' } },
        changes: { orderBy: { createdAt: 'desc' } },
        aiConversations: { orderBy: { updatedAt: 'desc' } },
      },
    });

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Calculate total word count
    const totalWordCount = project.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    return successResponse({ ...project, totalWordCount });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch project';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, genre, subGenre, coverImage, status, targetWords, setting, premise, writingStyle } = body;

    const existing = await db.novelProject.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Project not found', 404);
    }

    // Calculate current word count from chapters
    const chapterStats = await db.chapter.aggregate({
      where: { projectId: id },
      _sum: { wordCount: true },
    });

    const project = await db.novelProject.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(genre !== undefined && { genre }),
        ...(subGenre !== undefined && { subGenre }),
        ...(coverImage !== undefined && { coverImage }),
        ...(status !== undefined && { status }),
        ...(targetWords !== undefined && { targetWords: targetWords ? parseInt(targetWords) : null }),
        ...(setting !== undefined && { setting }),
        ...(premise !== undefined && { premise }),
        ...(writingStyle !== undefined && { writingStyle }),
        wordCount: chapterStats._sum.wordCount || 0,
      },
    });

    return successResponse(project);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update project';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id] - Delete project and all relations
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await db.novelProject.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Project not found', 404);
    }

    // Cascade delete is configured in Prisma schema
    await db.novelProject.delete({ where: { id } });

    return successResponse({ message: 'Project deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete project';
    return errorResponse(message);
  }
}
