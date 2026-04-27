import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { buildStoryBibleContext, buildOutlineContext, buildRecentChaptersContext, getChatSystemPrompt } from '@/lib/ai-prompts';

// POST /api/ai/chat - Send a message and get AI response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, contextType, conversationId } = body;

    if (!projectId || !message) {
      return errorResponse('projectId and message are required', 400);
    }

    // Load project context
    const project = await db.novelProject.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { sortOrder: 'asc' } },
        locations: { orderBy: { sortOrder: 'asc' } },
        loreItems: { orderBy: { sortOrder: 'asc' } },
        factions: { orderBy: { sortOrder: 'asc' } },
        outlines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            chapters: {
              orderBy: { sortOrder: 'asc' },
              select: { title: true, sortOrder: true, status: true, summary: true },
            },
          },
        },
        chapters: {
          orderBy: { sortOrder: 'desc' },
          take: 3,
          select: {
            title: true,
            content: true,
            summary: true,
            wordCount: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Build context strings
    const storyBible = buildStoryBibleContext(project);

    const outlineData = project.outlines.map(function (outline) {
      return {
        ...outline,
        chapters: outline.chapters.map(function (ch) {
          return { ...ch, sortOrder: ch.sortOrder ?? 0 };
        }),
      };
    });
    const outline = buildOutlineContext(outlineData);

    const recentChaptersData = project.chapters.map(function (ch) {
      return { ...ch, sortOrder: ch.sortOrder ?? 0 };
    });
    const recentChapters = buildRecentChaptersContext(recentChaptersData);

    // Build system prompt
    const systemPrompt = getChatSystemPrompt(contextType || 'writing', storyBible, outline, recentChapters);

    // Load or create conversation
    let conversation;
    let messages: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      conversation = await db.aiConversation.findUnique({ where: { id: conversationId } });
      if (conversation) {
        messages = JSON.parse(conversation.messages);
      }
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Call AI
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...messages,
      ],
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || '抱歉，我无法生成回复。';

    // Add AI response to messages
    messages.push({ role: 'assistant', content: aiResponse });

    // Save conversation
    if (conversation) {
      await db.aiConversation.update({
        where: { id: conversation.id },
        data: {
          messages: JSON.stringify(messages),
          updatedAt: new Date(),
        },
      });
    } else {
      conversation = await db.aiConversation.create({
        data: {
          projectId,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          context: contextType || 'writing',
          messages: JSON.stringify(messages),
        },
      });
    }

    return successResponse({
      conversationId: conversation.id,
      message: aiResponse,
      messages: messages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to process AI chat';
    return errorResponse(message);
  }
}
