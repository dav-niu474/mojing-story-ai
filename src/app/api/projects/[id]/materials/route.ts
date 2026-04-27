import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/materials - List all materials for project
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const materials = await db.material.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(materials);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch materials';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/materials - Create material
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, category, content, source, tags, isGlobal } = body;

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const material = await db.material.create({
      data: {
        projectId: id,
        title,
        category,
        content,
        source,
        tags,
        isGlobal: isGlobal ?? false,
      },
    });

    return successResponse(material, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create material';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/materials - Update material (send id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, title, category, content, source, tags, isGlobal } = body;

    if (!id) {
      return errorResponse('Material id is required', 400);
    }

    const existing = await db.material.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Material not found', 404);
    }

    const material = await db.material.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(source !== undefined && { source }),
        ...(tags !== undefined && { tags }),
        ...(isGlobal !== undefined && { isGlobal }),
      },
    });

    return successResponse(material);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update material';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/materials - Delete material (send id in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Material id is required', 400);
    }

    const existing = await db.material.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Material not found', 404);
    }

    await db.material.delete({ where: { id } });
    return successResponse({ message: 'Material deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete material';
    return errorResponse(message);
  }
}
