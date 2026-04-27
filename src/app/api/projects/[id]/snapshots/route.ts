import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/snapshots - List snapshots
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const snapshots = await db.versionSnapshot.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        type: true,
        note: true,
        createdAt: true,
      },
    });
    return successResponse(snapshots);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch snapshots';
    return errorResponse(message);
  }
}

// POST /api/projects/[id]/snapshots - Create snapshot or restore
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id } = await params;

    const project = await db.novelProject.findUnique({ where: { id } });
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const body = await request.json();
    const { action } = body;

    // Restore from snapshot
    if (action === 'restore') {
      const { snapshotId } = body;
      if (!snapshotId) {
        return errorResponse('snapshotId is required for restore action', 400);
      }

      const snapshot = await db.versionSnapshot.findFirst({
        where: { id: snapshotId, projectId: id },
      });
      if (!snapshot) {
        return errorResponse('Snapshot not found', 404);
      }

      const snapshotData = JSON.parse(snapshot.data);

      // Restore project basic info
      await db.novelProject.update({
        where: { id },
        data: {
          title: snapshotData.title,
          description: snapshotData.description,
          genre: snapshotData.genre,
          subGenre: snapshotData.subGenre,
          setting: snapshotData.setting,
          premise: snapshotData.premise,
          writingStyle: snapshotData.writingStyle,
          status: snapshotData.status,
        },
      });

      // Restore characters - delete existing and recreate
      await db.character.deleteMany({ where: { projectId: id } });
      if (snapshotData.characters?.length) {
        await db.character.createMany({
          data: snapshotData.characters.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            projectId: id,
            name: c.name as string,
            role: c.role as string | null,
            title: c.title as string | null,
            age: c.age as string | null,
            gender: c.gender as string | null,
            description: c.description as string | null,
            personality: c.personality as string | null,
            background: c.background as string | null,
            abilities: c.abilities as string | null,
            relationships: c.relationships as string | null,
            motivation: c.motivation as string | null,
            arc: c.arc as string | null,
            tags: c.tags as string | null,
            sortOrder: c.sortOrder as number,
          })),
        });
      }

      // Restore locations
      await db.location.deleteMany({ where: { projectId: id } });
      if (snapshotData.locations?.length) {
        await db.location.createMany({
          data: snapshotData.locations.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            projectId: id,
            name: l.name as string,
            category: l.category as string | null,
            description: l.description as string | null,
            history: l.history as string | null,
            features: l.features as string | null,
            atmosphere: l.atmosphere as string | null,
            tags: l.tags as string | null,
            sortOrder: l.sortOrder as number,
          })),
        });
      }

      // Restore lore items
      await db.loreItem.deleteMany({ where: { projectId: id } });
      if (snapshotData.loreItems?.length) {
        await db.loreItem.createMany({
          data: snapshotData.loreItems.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            projectId: id,
            name: l.name as string,
            category: l.category as string | null,
            description: l.description as string | null,
            details: l.details as string | null,
            constraints: l.constraints as string | null,
            tags: l.tags as string | null,
            sortOrder: l.sortOrder as number,
          })),
        });
      }

      // Restore factions
      await db.faction.deleteMany({ where: { projectId: id } });
      if (snapshotData.factions?.length) {
        await db.faction.createMany({
          data: snapshotData.factions.map((f: Record<string, unknown>) => ({
            id: f.id as string,
            projectId: id,
            name: f.name as string,
            description: f.description as string | null,
            goals: f.goals as string | null,
            members: f.members as string | null,
            territory: f.territory as string | null,
            power: f.power as string | null,
            tags: f.tags as string | null,
            sortOrder: f.sortOrder as number,
          })),
        });
      }

      // Restore outlines
      await db.outline.deleteMany({ where: { projectId: id } });
      if (snapshotData.outlines?.length) {
        await db.outline.createMany({
          data: snapshotData.outlines.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            projectId: id,
            title: o.title as string,
            type: o.type as string,
            description: o.description as string | null,
            keyEvents: o.keyEvents as string | null,
            sortOrder: o.sortOrder as number,
          })),
        });
      }

      // Restore chapters (and their versions)
      await db.chapterVersion.deleteMany({ where: { chapter: { projectId: id } } });
      await db.chapter.deleteMany({ where: { projectId: id } });
      if (snapshotData.chapters?.length) {
        for (const ch of snapshotData.chapters as Record<string, unknown>[]) {
          await db.chapter.create({
            data: {
              id: ch.id as string,
              projectId: id,
              outlineId: ch.outlineId as string | null,
              title: ch.title as string,
              summary: ch.summary as string | null,
              beats: ch.beats as string | null,
              content: ch.content as string | null,
              wordCount: ch.wordCount as number,
              status: ch.status as string,
              notes: ch.notes as string | null,
              sortOrder: ch.sortOrder as number,
            },
          });
        }
      }

      return successResponse({ message: 'Snapshot restored successfully', snapshotId });
    }

    // Create snapshot (default action)
    const { label, type, note } = body;

    // Serialize current project state
    const [characters, locations, loreItems, factions, outlines, chapters] = await Promise.all([
      db.character.findMany({ where: { projectId: id } }),
      db.location.findMany({ where: { projectId: id } }),
      db.loreItem.findMany({ where: { projectId: id } }),
      db.faction.findMany({ where: { projectId: id } }),
      db.outline.findMany({ where: { projectId: id } }),
      db.chapter.findMany({ where: { projectId: id } }),
    ]);

    const snapshotData = {
      title: project.title,
      description: project.description,
      genre: project.genre,
      subGenre: project.subGenre,
      setting: project.setting,
      premise: project.premise,
      writingStyle: project.writingStyle,
      status: project.status,
      characters,
      locations,
      loreItems,
      factions,
      outlines,
      chapters,
    };

    const snapshot = await db.versionSnapshot.create({
      data: {
        projectId: id,
        label: label || `快照 - ${new Date().toLocaleString('zh-CN')}`,
        type: type || 'milestone',
        data: JSON.stringify(snapshotData),
        note: note || null,
      },
    });

    return successResponse(snapshot, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create/restore snapshot';
    return errorResponse(message);
  }
}

// DELETE /api/projects/[id]/snapshots - Delete a snapshot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDbInitialized();
    const { id: projectId } = await params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('Snapshot id is required', 400);
    }

    const existing = await db.versionSnapshot.findFirst({ where: { id, projectId } });
    if (!existing) {
      return errorResponse('Snapshot not found', 404);
    }

    await db.versionSnapshot.delete({ where: { id } });
    return successResponse({ message: 'Snapshot deleted successfully' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete snapshot';
    return errorResponse(message);
  }
}
