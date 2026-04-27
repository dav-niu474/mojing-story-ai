import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/lore - List all lore items for project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const loreItems = await db.loreItem.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
    return successResponse(loreItems);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch lore items';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/lore - Create lore item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, description, details, constraints, tags, sortOrder } = body;

    if (!name) {
      return errorResponse('Name is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const loreItem = await db.loreItem.create({
      data: {
        projectId: id,
        name,
        category,
        description,
        details,
        constraints,
        tags,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(loreItem, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create lore item';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/lore - Update lore item (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, name, category, description, details, constraints, tags, sortOrder } = body;

    if (!id) {
      return errorResponse('Lore item id is required', 400);
    }

    const existing = await db.loreItem.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Lore item not found', 404);
    }

    const loreItem = await db.loreItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(details !== undefined && { details }),
        ...(constraints !== undefined && { constraints }),
        ...(tags !== undefined && { tags }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(loreItem);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update lore item';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/lore - Delete lore item (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Lore item id is required', 400);
    }

    const existing = await db.loreItem.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Lore item not found', 404);
    }

    await db.loreItem.delete({ where: { id } });
    return successResponse({ message: 'Lore item deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete lore item';
    return errorResponse(message);
  }
}
