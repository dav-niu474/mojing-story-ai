import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/locations - List all locations for project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const locations = await db.location.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: 'asc' },
    });
    return successResponse(locations);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch locations';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/locations - Create location
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, description, history, features, atmosphere, tags, sortOrder } = body;

    if (!name) {
      return errorResponse('Name is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const location = await db.location.create({
      data: {
        projectId: id,
        name,
        category,
        description,
        history,
        features,
        atmosphere,
        tags,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(location, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create location';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/locations - Update location (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, name, category, description, history, features, atmosphere, tags, sortOrder } = body;

    if (!id) {
      return errorResponse('Location id is required', 400);
    }

    const existing = await db.location.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Location not found', 404);
    }

    const location = await db.location.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(history !== undefined && { history }),
        ...(features !== undefined && { features }),
        ...(atmosphere !== undefined && { atmosphere }),
        ...(tags !== undefined && { tags }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(location);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update location';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/locations - Delete location (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Location id is required', 400);
    }

    const existing = await db.location.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Location not found', 404);
    }

    await db.location.delete({ where: { id } });
    return successResponse({ message: 'Location deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete location';
    return errorResponse(message);
  }
}
