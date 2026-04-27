import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status transitions
const VALID_STATUSES = ['proposed', 'approved', 'in-progress', 'applied', 'rejected', 'archived'];

// GET /api/projects/[id]/changes - List change proposals
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const changes = await db.changeProposal.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(changes);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch change proposals';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/changes - Create change proposal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { title, description, type, targetScope, impact, plan, status } = body;

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const change = await db.changeProposal.create({
      data: {
        projectId: id,
        title,
        description,
        type: type || 'revision',
        targetScope,
        impact,
        plan,
        status: status || 'proposed',
      },
    });

    return successResponse(change, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create change proposal';
    return errorResponse(message);
  }
}

// PUT /api/projects/[id]/changes - Update change proposal status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id, title, description, type, targetScope, impact, plan, status } = body;

    if (!id) {
      return errorResponse('Change proposal id is required', 400);
    }

    const existing = await db.changeProposal.findFirst({ where: { id, projectId: projectId } });
    if (!existing) {
      return errorResponse('Change proposal not found', 404);
    }

    // Validate status transition
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const change = await db.changeProposal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(targetScope !== undefined && { targetScope }),
        ...(impact !== undefined && { impact }),
        ...(plan !== undefined && { plan }),
        ...(status !== undefined && { status }),
        ...(status === 'applied' && { appliedAt: new Date() }),
      },
    });

    return successResponse(change);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update change proposal';
    return errorResponse(message);
  }
}
