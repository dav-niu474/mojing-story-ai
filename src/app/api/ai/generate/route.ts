import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { buildStoryBibleContext, buildOutlineContext, buildRecentChaptersContext, getGenerateSystemPrompt } from '@/lib/ai-prompts';

// POST /api/ai/generate - Generate content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, type, params } = body;

    if (!projectId || !type) {
      return errorResponse('projectId and type are required', 400);
    }

    const VALID_TYPES = ['outline', 'chapter', 'continuation', 'polish', 'character', 'worldbuilding', 'beats', 'consistency-check'];
    if (!VALID_TYPES.includes(type)) {
      return errorResponse(`Invalid type. Valid types: ${VALID_TYPES.join(', ')}`, 400);
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
              select: { id: true, title: true, sortOrder: true, status: true, summary: true },
            },
          },
        },
        chapters: {
          orderBy: { sortOrder: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            content: true,
            summary: true,
            wordCount: true,
            sortOrder: true,
            beats: true,
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

    // Build user message based on type
    const userMessage = buildGenerateUserMessage(type, params || {}, storyBible, outline, recentChapters);

    // Get system prompt
    const systemPrompt = getGenerateSystemPrompt(type);

    // Call AI
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Try to parse JSON response for structured types
    let parsedResponse: unknown = aiResponse;
    if (['outline', 'character', 'worldbuilding', 'beats', 'consistency-check'].includes(type)) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If parsing fails, return raw text
        parsedResponse = aiResponse;
      }
    }

    return successResponse({
      type,
      result: parsedResponse,
      rawResponse: aiResponse,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to generate content';
    return errorResponse(message);
  }
}

/**
 * Build user message for each generation type
 */
function buildGenerateUserMessage(
  type: string,
  params: Record<string, unknown>,
  storyBible: string,
  outline: string,
  recentChapters: string,
): string {
  const contextBlock = `
=== 作品设定 ===
${storyBible}

=== 大纲 ===
${outline}

=== 近期章节 ===
${recentChapters}`;

  switch (type) {
    case 'outline':
      return `请根据以下信息，生成一份详细的大纲：

${contextBlock}

额外要求：${params.instruction || '请生成完整的大纲结构'}

请以JSON格式输出。`;

    case 'chapter':
      return `请根据以下信息，撰写章节内容：

${contextBlock}

章节信息：
- 标题：${params.title || '待定'}
- 概要：${params.summary || '待定'}
- 场景节拍：${params.beats || '待定'}

额外要求：${params.instruction || ''}

请直接输出章节正文。`;

    case 'continuation':
      return `请续写以下内容：

${contextBlock}

已有内容（最后部分）：
${(params.existingContent as string) || recentChapters}

续写要求：${params.instruction || '自然衔接上文，继续推进剧情'}

请直接输出续写内容。`;

    case 'polish':
      return `请润色以下文本：

${contextBlock}

待润色文本：
${params.content || ''}

润色要求：${params.instruction || '提升文笔质量，增强画面感和代入感'}

请直接输出润色后的文本。`;

    case 'character':
      return `请完善以下角色的设定：

${contextBlock}

角色基本信息：
- 姓名：${params.name || '待定'}
- 角色：${params.role || '待定'}
- 现有描述：${params.existingInfo || '无'}

额外要求：${params.instruction || ''}

请以JSON格式输出。`;

    case 'worldbuilding':
      return `请扩展以下世界观设定：

${contextBlock}

扩展方向：${params.direction || '全面扩展'}
额外要求：${params.instruction || ''}

请以JSON格式输出。`;

    case 'beats':
      return `请为以下章节生成场景节拍：

${contextBlock}

章节信息：
- 标题：${params.title || '待定'}
- 概要：${params.summary || '待定'}
- 所属大纲：${params.outlineTitle || '待定'}

额外要求：${params.instruction || ''}

请以JSON数组格式输出。`;

    case 'consistency-check':
      return `请检查以下作品的一致性：

${contextBlock}

检查范围：${params.scope || '全面检查'}

请以JSON格式输出检查结果。`;

    default:
      return `${contextBlock}\n\n${(params.instruction as string) || '请生成内容'}`;
  }
}
