import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/factions - List all factions for project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const factions = await db.faction.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
    return successResponse(factions);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch factions';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/factions - Create faction
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { name, description, goals, members, territory, power, tags, sortOrder } = body;

    if (!name) {
      return errorResponse('Name is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const faction = await db.faction.create({
      data: {
        projectId: id,
        name,
        description,
        goals,
        members,
        territory,
        power,
        tags,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(faction, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create faction';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/factions - Update faction (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, name, description, goals, members, territory, power, tags, sortOrder } = body;

    if (!id) {
      return errorResponse('Faction id is required', 400);
    }

    const existing = await db.faction.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Faction not found', 404);
    }

    const faction = await db.faction.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(goals !== undefined && { goals }),
        ...(members !== undefined && { members }),
        ...(territory !== undefined && { territory }),
        ...(power !== undefined && { power }),
        ...(tags !== undefined && { tags }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(faction);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update faction';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/factions - Delete faction (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Faction id is required', 400);
    }

    const existing = await db.faction.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Faction not found', 404);
    }

    await db.faction.delete({ where: { id } });
    return successResponse({ message: 'Faction deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete faction';
    return errorResponse(message);
  }
}
