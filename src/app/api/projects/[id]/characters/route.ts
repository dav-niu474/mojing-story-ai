import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/characters - List all characters for project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const characters = await db.character.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
    return successResponse(characters);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch characters';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/characters - Create character
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { name, role, title, age, gender, description, personality, background, abilities, relationships, motivation, arc, tags, sortOrder } = body;

    if (!name) {
      return errorResponse('Name is required', 400);
    }

    // Verify project exists
    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const character = await db.character.create({
      data: {
        projectId: id,
        name,
        role,
        title,
        age,
        gender,
        description,
        personality,
        background,
        abilities,
        relationships,
        motivation,
        arc,
        tags,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(character, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create character';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/characters - Update character (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, name, role, title, age, gender, description, personality, background, abilities, relationships, motivation, arc, tags, sortOrder } = body;

    if (!id) {
      return errorResponse('Character id is required', 400);
    }

    const existing = await db.character.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Character not found', 404);
    }

    const character = await db.character.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(title !== undefined && { title }),
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(description !== undefined && { description }),
        ...(personality !== undefined && { personality }),
        ...(background !== undefined && { background }),
        ...(abilities !== undefined && { abilities }),
        ...(relationships !== undefined && { relationships }),
        ...(motivation !== undefined && { motivation }),
        ...(arc !== undefined && { arc }),
        ...(tags !== undefined && { tags }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(character);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update character';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/characters - Delete character (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Character id is required', 400);
    }

    const existing = await db.character.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Character not found', 404);
    }

    await db.character.delete({ where: { id } });
    return successResponse({ message: 'Character deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete character';
    return errorResponse(message);
  }
}
