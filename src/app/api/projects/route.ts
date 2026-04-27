import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

// GET /api/projects - List all projects with stats
export async function GET() {
  try {
    await ensureDbInitialized();
    const projects = await db.novelProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { chapters: true, characters: true, outlines: true },
        },
      },
    });

    // Calculate total word count for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const chapterStats = await db.chapter.aggregate({
          where: { projectId: project.id },
          _sum: { wordCount: true },
        });
        return {
          ...project,
          totalWordCount: chapterStats._sum.wordCount || 0,
          chapterCount: project._count.chapters,
          characterCount: project._count.characters,
          outlineCount: project._count.outlines,
        };
      })
    );

    return successResponse(projectsWithStats);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch projects';
    return errorResponse(message);
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { title, description, genre, subGenre, coverImage, targetWords, setting, premise, writingStyle } = body;

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const project = await db.novelProject.create({
      data: {
        title,
        description,
        genre,
        subGenre,
        coverImage,
        targetWords: targetWords ? parseInt(targetWords) : null,
        setting,
        premise,
        writingStyle,
      },
    });

    return successResponse(project, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create project';
    return errorResponse(message);
  }
}
