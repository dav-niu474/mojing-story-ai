import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { buildStoryBibleContext } from '@/lib/ai-prompts';
import { getNimModelId, DEFAULT_MODEL } from '@/lib/models';
import { nvidiaNimGenerateWithFallback } from '@/lib/nvidia-nim';

// ─── Types ───────────────────────────────────────────────────────────────

interface OneClickRequest {
  premise: string;
  genre?: string;
  style?: string;
  model?: string;
  chapters?: number;
  wordsPerChapter?: number;
}

// ─── JSON Parsing Utility ────────────────────────────────────────────────

function parseJsonResponse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }

  const jsonBlockMatch = text.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

// ─── Pipeline Step Functions (inline for one-click flow) ─────────────────

/**
 * Step 1: Generate concept from premise
 */
async function generateConcept(
  projectId: string,
  premise: string,
  genre: string,
  style: string,
  model: string,
) {
  const systemPrompt = `你是一个专业的网文创意策划师。根据给定的故事前提，生成完整的故事概念框架。

要求：
1. 分析故事类型和子类型
2. 提炼核心主题（2-4个）
3. 设计世界观设定概述
4. 构建核心冲突
5. 确定故事基调和风格

输出格式为JSON：
{
  "concept": "故事概念概述（200-500字）",
  "genre": "类型",
  "subGenre": "子类型",
  "themes": ["主题1", "主题2"],
  "setting": "世界观设定概述（100-300字）",
  "conflicts": ["核心冲突1", "核心冲突2"],
  "writingStyle": "推荐文风"
}`;

  const userMessage = `请根据以下故事前提，生成完整的故事概念框架：

故事前提：${premise}
类型偏好：${genre || '不限'}
文风偏好：${style || '不限'}

请以JSON格式输出。`;

  const { text: aiResponse, usedModel, fallbackUsed } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: 0.7, max_tokens: 4096 });
  if (fallbackUsed) {
    console.log(`[One-Click] Concept step: primary model failed, used fallback: ${usedModel}`);
  }
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('概念生成失败：AI返回格式无法解析');
  }

  const data = parsed as Record<string, unknown>;

  const updatedProject = await db.novelProject.update({
    where: { id: projectId },
    data: {
      premise: (data.concept as string) || premise,
      genre: (data.genre as string) || genre,
      subGenre: (data.subGenre as string) || null,
      setting: (data.setting as string) || null,
      writingStyle: (data.writingStyle as string) || style,
      description: (data.concept as string) || null,
    },
  });

  return { generated: data, project: updatedProject };
}

/**
 * Step 2: Generate world building
 */
async function generateWorldbuilding(
  projectId: string,
  concept: string,
  genre: string,
  setting: string,
  model: string,
) {
  const systemPrompt = `你是一个专业的网文世界观设计师。根据给定的故事概念，创建完整的世界观设定。

要求：
1. 设计4-8个核心角色，包含主角、反派和重要配角
2. 设计3-6个关键地点
3. 设计3-6个核心世界观规则/设定
4. 设计2-4个势力阵营
5. 所有设定必须有内在逻辑，互相支撑

输出格式为JSON：
{
  "characters": [
    { "name": "角色名", "role": "protagonist|antagonist|supporting|minor", "title": "称号", "description": "外貌描述", "personality": "性格特征", "background": "背景故事", "abilities": "能力/技能", "relationships": "人物关系", "motivation": "动机/目标", "arc": "人物弧光" }
  ],
  "locations": [
    { "name": "地点名", "category": "分类", "description": "描述", "history": "历史", "features": "特色", "atmosphere": "氛围" }
  ],
  "lores": [
    { "name": "设定名", "category": "分类", "description": "描述", "details": "详细规则", "constraints": "限制/代价" }
  ],
  "factions": [
    { "name": "势力名", "description": "描述", "goals": "目标", "members": "核心成员", "territory": "领地", "power": "实力" }
  ]
}`;

  const userMessage = `请根据以下信息，创建完整的世界观设定：

故事概念：${concept}
类型：${genre}
${setting ? '已有世界观参考：' + setting : ''}

请以JSON格式输出。`;

  const { text: aiResponse, usedModel: usedModel2, fallbackUsed: fallbackUsed2 } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: 0.7, max_tokens: 8192 });
  if (fallbackUsed2) {
    console.log(`[One-Click] Worldbuilding step: primary model failed, used fallback: ${usedModel2}`);
  }
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('世界观生成失败：AI返回格式无法解析');
  }

  const data = parsed as Record<string, unknown>;

  // Persist characters
  const savedCharacters = [];
  const characters = (data.characters as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const character = await db.character.create({
      data: {
        projectId,
        name: (c.name as string) || `角色${i + 1}`,
        role: (c.role as string) || 'supporting',
        title: (c.title as string) || null,
        description: (c.description as string) || null,
        personality: (c.personality as string) || null,
        background: (c.background as string) || null,
        abilities: (c.abilities as string) || null,
        relationships: (c.relationships as string) || null,
        motivation: (c.motivation as string) || null,
        arc: (c.arc as string) || null,
        sortOrder: i,
      },
    });
    savedCharacters.push(character);
  }

  // Persist locations
  const savedLocations = [];
  const locations = (data.locations as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < locations.length; i++) {
    const l = locations[i];
    const location = await db.location.create({
      data: {
        projectId,
        name: (l.name as string) || `地点${i + 1}`,
        category: (l.category as string) || null,
        description: (l.description as string) || null,
        history: (l.history as string) || null,
        features: (l.features as string) || null,
        atmosphere: (l.atmosphere as string) || null,
        sortOrder: i,
      },
    });
    savedLocations.push(location);
  }

  // Persist lore items
  const savedLore = [];
  const lores = (data.lores as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < lores.length; i++) {
    const l = lores[i];
    const lore = await db.loreItem.create({
      data: {
        projectId,
        name: (l.name as string) || `设定${i + 1}`,
        category: (l.category as string) || null,
        description: (l.description as string) || null,
        details: (l.details as string) || null,
        constraints: (l.constraints as string) || null,
        sortOrder: i,
      },
    });
    savedLore.push(lore);
  }

  // Persist factions
  const savedFactions = [];
  const factions = (data.factions as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < factions.length; i++) {
    const f = factions[i];
    const faction = await db.faction.create({
      data: {
        projectId,
        name: (f.name as string) || `势力${i + 1}`,
        description: (f.description as string) || null,
        goals: (f.goals as string) || null,
        members: (f.members as string) || null,
        territory: (f.territory as string) || null,
        power: (f.power as string) || null,
        sortOrder: i,
      },
    });
    savedFactions.push(faction);
  }

  return {
    generated: data,
    saved: {
      characters: savedCharacters,
      locations: savedLocations,
      lore: savedLore,
      factions: savedFactions,
    },
  };
}

/**
 * Step 3: Generate outline
 */
async function generateOutline(
  projectId: string,
  model: string,
  targetChapters: number,
) {
  // Reload project with world data
  const project = await db.novelProject.findUnique({
    where: { id: projectId },
    include: {
      characters: { orderBy: { sortOrder: 'asc' } },
      locations: { orderBy: { sortOrder: 'asc' } },
      loreItems: { orderBy: { sortOrder: 'asc' } },
      factions: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!project) {
    throw new Error('项目不存在');
  }

  const storyBible = buildStoryBibleContext(project);

  const systemPrompt = `你是一个专业的网文大纲创作者。根据给定的世界观设定，生成完整的大纲结构。

要求：
1. 按照3-5幕结构组织大纲
2. 每幕有明确的核心冲突和解决方案
3. 标注关键转折点和爽点
4. 总计约${targetChapters}个章节，分布在各幕中
5. 每个章节有概要
6. 节奏要有起伏

输出格式为JSON：
{
  "outlines": [
    {
      "title": "卷/幕标题",
      "type": "act|volume|arc",
      "description": "概述",
      "keyEvents": ["关键事件1", "关键事件2"],
      "chapters": [
        { "title": "章节标题", "summary": "章节概要", "beats": "场景节拍提示" }
      ]
    }
  ]
}`;

  const userMessage = `请根据以下作品设定，生成完整的大纲结构：

=== 作品设定 ===
${storyBible}

请生成约${targetChapters}个章节的大纲，分为3-5幕。

请以JSON格式输出。`;

  const { text: aiResponse, usedModel: usedModel3, fallbackUsed: fallbackUsed3 } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: 0.7, max_tokens: 8192 });
  if (fallbackUsed3) {
    console.log(`[One-Click] Outline step: primary model failed, used fallback: ${usedModel3}`);
  }
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('大纲生成失败：AI返回格式无法解析');
  }

  const data = parsed as Record<string, unknown>;

  // Persist outlines and chapters
  const savedOutlines = [];
  const savedChapters = [];
  const outlines = (data.outlines as Array<Record<string, unknown>>) || [];

  for (let oi = 0; oi < outlines.length; oi++) {
    const o = outlines[oi];
    const keyEvents = Array.isArray(o.keyEvents) ? (o.keyEvents as string[]).join('\n') : (o.keyEvents as string) || null;

    const outline = await db.outline.create({
      data: {
        projectId,
        title: (o.title as string) || `第${oi + 1}幕`,
        type: (o.type as string) || 'act',
        description: (o.description as string) || null,
        keyEvents,
        sortOrder: oi,
      },
    });
    savedOutlines.push(outline);

    const chapters = (o.chapters as Array<Record<string, unknown>>) || [];
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const chapter = await db.chapter.create({
        data: {
          projectId,
          outlineId: outline.id,
          title: (ch.title as string) || `第${ci + 1}章`,
          summary: (ch.summary as string) || null,
          beats: (ch.beats as string) || null,
          status: 'planned',
          sortOrder: ci,
        },
      });
      savedChapters.push(chapter);
    }
  }

  return {
    generated: data,
    saved: {
      outlines: savedOutlines,
      chapters: savedChapters,
    },
  };
}

// ─── Main Route Handler ──────────────────────────────────────────────────

// POST /api/ai/one-click - One-click creation of an entire project
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = (await request.json()) as OneClickRequest;

    const { premise, genre, style, model, chapters = 10, wordsPerChapter = 3000 } = body;

    if (!premise) {
      return errorResponse('premise（故事前提）是必填项', 400);
    }

    const nimModelId = getNimModelId(model || DEFAULT_MODEL);

    // ─── Step 0: Create the project ────────────────────────────────────
    const projectTitle = premise.length > 20 ? premise.slice(0, 20) + '...' : premise;
    const project = await db.novelProject.create({
      data: {
        title: projectTitle,
        genre: genre || null,
        writingStyle: style || null,
        premise,
        targetWords: chapters * wordsPerChapter,
        status: 'draft',
      },
    });

    // ─── Step 1: Generate concept ──────────────────────────────────────
    console.log(`[One-Click] Step 1: Generating concept for project ${project.id}`);
    const conceptResult = await generateConcept(
      project.id,
      premise,
      genre || '玄幻',
      style || '',
      nimModelId,
    );

    // ─── Step 2: Generate worldbuilding ────────────────────────────────
    console.log(`[One-Click] Step 2: Generating worldbuilding for project ${project.id}`);
    const worldbuildingResult = await generateWorldbuilding(
      project.id,
      conceptResult.generated.concept as string || premise,
      conceptResult.project.genre || genre || '玄幻',
      conceptResult.project.setting || '',
      nimModelId,
    );

    // ─── Step 3: Generate outline ──────────────────────────────────────
    console.log(`[One-Click] Step 3: Generating outline for project ${project.id}`);
    const outlineResult = await generateOutline(
      project.id,
      nimModelId,
      chapters,
    );

    // ─── Return complete project data ──────────────────────────────────
    const completeProject = await db.novelProject.findUnique({
      where: { id: project.id },
      include: {
        characters: { orderBy: { sortOrder: 'asc' } },
        locations: { orderBy: { sortOrder: 'asc' } },
        loreItems: { orderBy: { sortOrder: 'asc' } },
        factions: { orderBy: { sortOrder: 'asc' } },
        outlines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            chapters: { orderBy: { sortOrder: 'asc' } },
          },
        },
        chapters: { orderBy: { sortOrder: 'asc' } },
        materials: true,
      },
    });

    return successResponse({
      message: '一键创建完成！项目已生成概念、世界观和大纲。',
      project: completeProject,
      pipeline: {
        concept: {
          status: 'completed',
          generated: conceptResult.generated,
        },
        worldbuilding: {
          status: 'completed',
          generated: worldbuildingResult.generated,
          savedCount: {
            characters: worldbuildingResult.saved.characters.length,
            locations: worldbuildingResult.saved.locations.length,
            lore: worldbuildingResult.saved.lore.length,
            factions: worldbuildingResult.saved.factions.length,
          },
        },
        outline: {
          status: 'completed',
          generated: outlineResult.generated,
          savedCount: {
            outlines: outlineResult.saved.outlines.length,
            chapters: outlineResult.saved.chapters.length,
          },
        },
      },
      nextSteps: [
        '使用 /api/ai/pipeline?step=chapters 生成章节节拍',
        '使用 /api/ai/pipeline?step=writing 逐章写作',
        '使用 /api/ai/pipeline?step=polish 润色章节',
      ],
    }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'One-click creation failed';
    console.error(`[One-Click Error] ${message}`, e);
    return errorResponse(message);
  }
}
